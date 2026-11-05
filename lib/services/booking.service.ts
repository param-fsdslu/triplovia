/**
 * Hotel booking service — core business logic for creating and managing bookings.
 *
 * Handles the full lifecycle: creation (with pricing, guests, email), retrieval,
 * status updates, cancellation, room assignment (check-in), and checkout.
 *
 * All public methods are static and use the server database client (lib/db/server).
 * Email notifications are sent as a best-effort side effect — failures are logged
 * but do not roll back the booking.
 *
 * Note: The lib/actions/bookings.ts server actions are the preferred entry point
 * for Next.js server components and form submissions. This class is used internally
 * and by the admin panel for more granular control.
 */
import { snapshotHotelPolicy } from '@/lib/services/hotel-policy.service'
import { createClient } from '@/lib/db/server';
import type {
  Booking,
  BookingWithDetails,
  CreateBookingDto,
  BookingStatus,
} from '@/lib/types';
import { emailService } from './email.service';
import { calculateBookingTax } from '@/lib/utils';
import { serverLog } from '@/lib/utils/server-log'

export class BookingService {
  /**
   * Generates a unique booking reference in the format BK-YYYY-NNNNNN.
   * Note: Does not guarantee collision safety on its own — callers should
   * retry on unique constraint violations if needed.
   */
  private static generateBookingReference(): string {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 1000000)
      .toString()
      .padStart(6, '0');
    return `BK-${year}-${random}`;
  }

  /**
   * Calculates booking price breakdown using the GST slab structure:
   *   - Room GST slab: 0% under ₹1000, 5% for ₹1000–₹7500, 18% above ₹7500
   *   - Service charge: 6% of taxable base
   *   - GST on service charge: 18% of service charge
   */
  private static calculateTotals(params: {
    pricePerNight: number;
    totalNights: number;
    numRooms: number;
    mealPlanTotal?: number;
    discountAmount?: number;
  }) {
    const baseSubtotal = params.pricePerNight * params.totalNights * params.numRooms;
    const mealPlanTotal = params.mealPlanTotal || 0;
    const discountAmount = params.discountAmount || 0;

    const tax = calculateBookingTax(params.pricePerNight, baseSubtotal, mealPlanTotal);

    return {
      subtotal: baseSubtotal,
      taxAmount: tax.gstAmount,
      taxPercentage: tax.gstRate * 100,
      serviceCharge: tax.serviceCharge + tax.gstOnServiceCharge,
      discountAmount,
      totalAmount: tax.totalAmount - discountAmount,
    };
  }

  /**
   * Calculates the number of nights between ISO date strings.
   * Uses Math.ceil to handle daylight saving time edge cases.
   */
  private static calculateNights(checkIn: string, checkOut: string): number {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  /**
   * Creates a booking: fetches live pricing from room_types, inserts the booking
   * row, inserts booking_guests (with rollback on failure), and sends a
   * confirmation email (non-fatal — booking is kept even if email fails).
   * Returns the newly inserted Booking row.
   */
  static async createBooking(
    userId: string,
    bookingData: CreateBookingDto
  ): Promise<Booking> {
    const db = await createClient();

    // 1. Get room type details for pricing and availability
    const { data: roomType, error: rtError } = await db
      .from('room_types')
      .select('base_price, prepayment_required, credit_card_required, hotel_id, num_available_rooms, name')
      .eq('id', bookingData.roomTypeId)
      .single();

    if (rtError || !roomType) {
      throw new Error('Room type not found');
    }

    // Check room availability for the requested dates
    const { data: overlappingBookings } = await db
      .from('bookings')
      .select('num_rooms')
      .eq('room_type_id', bookingData.roomTypeId)
      .in('status', ['confirmed', 'pending'])
      .lt('check_in_date', bookingData.checkOutDate)
      .gt('check_out_date', bookingData.checkInDate);

    const bookedRooms = (overlappingBookings || []).reduce(
      (sum, b) => sum + (b.num_rooms || 1), 0
    );
    const availableRooms = (roomType.num_available_rooms || 0) - bookedRooms;

    if (bookingData.numRooms > availableRooms) {
      if (availableRooms <= 0) {
        throw new Error(`No ${roomType.name} rooms available for the selected dates`);
      }
      throw new Error(
        `Only ${availableRooms} ${roomType.name} room${availableRooms === 1 ? '' : 's'} available for the selected dates`
      );
    }

    // 2. Calculate totals
    const totalNights = this.calculateNights(
      bookingData.checkInDate,
      bookingData.checkOutDate
    );

    const totals = this.calculateTotals({
      pricePerNight: roomType.base_price,
      totalNights,
      numRooms: bookingData.numRooms,
    });

    const policySnapshot = await snapshotHotelPolicy(bookingData.hotelId);

    // 3. Create booking
    const { data: booking, error: bookingError } = await db
      .from('bookings')
      .insert({
        ...policySnapshot,
        booking_reference: this.generateBookingReference(),
        user_id: userId,
        hotel_id: bookingData.hotelId,
        room_type_id: bookingData.roomTypeId,
        check_in_date: bookingData.checkInDate,
        check_out_date: bookingData.checkOutDate,
        num_adults: bookingData.numAdults,
        num_children: bookingData.numChildren,
        children_ages: bookingData.children_ages,
        num_rooms: bookingData.numRooms,
        total_nights: totalNights,
        price_per_night: roomType.base_price,
        subtotal: totals.subtotal,
        tax_amount: totals.taxAmount,
        tax_percentage: totals.taxPercentage,
        service_charge: totals.serviceCharge,
        discount_amount: totals.discountAmount,
        total_amount: totals.totalAmount,
        currency: 'INR',
        status: 'pending',
        special_requests: bookingData.specialRequests,
        prepayment_required: roomType.prepayment_required,
        credit_card_required: roomType.credit_card_required,
        booking_source: 'web',
      })
      .select()
      .single();

    if (bookingError) {
      throw new Error(`Failed to create booking: ${bookingError.message}`);
    }

    // 4. Create booking guests
    if (bookingData.guests && bookingData.guests.length > 0) {
      const guestsData = bookingData.guests.map((guest) => ({
        ...guest,
        booking_id: booking.id,
      }));

      const { error: guestsError } = await db
        .from('booking_guests')
        .insert(guestsData);

      if (guestsError) {
        // Rollback booking if guests insertion fails
        await db.from('bookings').delete().eq('id', booking.id);
        throw new Error(`Failed to add guests: ${guestsError.message}`);
      }
    }

    // 5. Apply promo code if provided
    if (bookingData.promo_code) {
      // TODO: Implement promo code validation and application
    }

    // Confirmation is sent only after successful payment by notifyBookingConfirmed.

    return booking;
  }

  /**
   * Fetches a booking with hotel, room type, guests, and payment joins.
   * Pass userId to enforce ownership — returns null if IDs don't match.
   */
  static async getBookingById(
    bookingId: string,
    userId?: string
  ): Promise<BookingWithDetails | null> {
    const db = await createClient();

    let query = db
      .from('bookings')
      .select(
        `
        *,
        hotel:hotels(id, name, slug, city, address_line_1, phone, email),
        room_type:room_types(id, name, bed_configuration, size_sqm),
        booking_guests(*),
        payments(*)
      `
      )
      .eq('id', bookingId);

    // If userId provided, ensure user owns the booking
    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query.single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to get booking: ${error.message}`);
    }

    return data;
  }

  /**
   * Fetches a booking by its human-readable reference (e.g. BK-2024-123456).
   * Used on the booking confirmation and detail pages. Pass userId to enforce ownership.
   */
  static async getBookingByReference(
    reference: string,
    userId?: string
  ): Promise<BookingWithDetails | null> {
    const db = await createClient();

    let query = db
      .from('bookings')
      .select(
        `
        *,
        hotel:hotels(id, name, slug, city, address_line_1, phone, email),
        room_type:room_types(id, name, bed_configuration, size_sqm),
        booking_guests(*),
        payments(*)
      `
      )
      .eq('booking_reference', reference);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query.single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to get booking: ${error.message}`);
    }

    return data;
  }

  /**
   * Returns all bookings for a user, newest first.
   * Includes hotel thumbnail images (primary image first) for list views.
   */
  static async getUserBookings(
    userId: string,
    filters?: { status?: BookingStatus }
  ): Promise<BookingWithDetails[]> {
    const db = await createClient();

    let query = db
      .from('bookings')
      .select(
        `
        *,
        hotel:hotels(id, name, slug, city, address_line_1, hotel_images(image_url, is_primary)),
        room_type:room_types(id, name, bed_configuration),
        booking_guests(*),
        payments(*)
      `
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get user bookings: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Updates booking_status and sets cancelled_at timestamp when cancelling.
   * Used by admin actions and cancelBooking — prefer cancelBooking for user-facing flows
   * as it includes ownership verification and email notification.
   */
  static async updateBookingStatus(
    bookingId: string,
    status: BookingStatus
  ): Promise<Booking> {
    const db = await createClient();

    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'cancelled') {
      updateData.cancelled_at = new Date().toISOString();
    }

    const { data, error } = await db
      .from('bookings')
      .update(updateData)
      .eq('id', bookingId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update booking: ${error.message}`);
    }

    return data;
  }

  /**
   * Cancels a booking after verifying ownership and cancellation deadline.
   * Sends a cancellation email (non-fatal). Refund processing is handled separately
   * via /api/payment/refund — this method only updates the booking status.
   */
  static async cancelBooking(bookingId: string, userId: string): Promise<Booking> {
    const db = await createClient();

    // 1. Get booking to verify ownership and check cancellation policy
    const { data: booking, error: fetchError } = await db
      .from('bookings')
      .select('*, user_id, status, cancellation_deadline')
      .eq('id', bookingId)
      .single();

    if (fetchError || !booking) {
      throw new Error('Booking not found');
    }

    if (booking.user_id !== userId) {
      throw new Error('Unauthorized to cancel this booking');
    }

    if (booking.status === 'cancelled') {
      throw new Error('Booking is already cancelled');
    }

    if (booking.status === 'checked_out') {
      throw new Error('Cannot cancel a completed booking');
    }

    // Check cancellation deadline
    if (booking.cancellation_deadline) {
      const deadline = new Date(booking.cancellation_deadline);
      if (new Date() > deadline) {
        throw new Error('Cancellation deadline has passed');
      }
    }

    // 2. Update booking status
    const cancelledBooking = await this.updateBookingStatus(bookingId, 'cancelled');

    // 3. Process refund if payment was made
    // TODO: Implement refund logic based on cancellation policy

    // 4. Send cancellation email
    try {
      const { data: user } = await db.auth.getUser();
      const { data: hotel } = await db
        .from('hotels')
        .select('name')
        .eq('id', booking.hotel_id)
        .single();

      const guestEmail = booking.guest_email || user?.user?.email;
      if (user?.user && guestEmail && hotel) {
        await emailService.sendBookingCancellation({
          to: guestEmail,
          userName: user.user.user_metadata?.name || guestEmail.split('@')[0],
          bookingId: booking.booking_reference,
          hotelName: hotel.name,
          checkInDate: booking.check_in_date,
          checkOutDate: booking.check_out_date,
          refundAmount: booking.payment_status === 'paid' ? booking.total_amount : undefined,
        });
      }
    } catch (emailError) {
      serverLog.error('Failed to send cancellation email:', emailError);
    }

    return cancelledBooking;
  }

  /**
   * Assigns a physical room to a booking and sets status to checked_in.
   * Also marks the room as 'occupied' in the rooms table.
   * Called by admin during the check-in process.
   */
  static async assignRoom(bookingId: string, roomId: string): Promise<Booking> {
    const db = await createClient();

    const { data, error } = await db
      .from('bookings')
      .update({
        room_id: roomId,
        status: 'checked_in',
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to assign room: ${error.message}`);
    }

    // Update room status
    await db.from('rooms').update({ status: 'occupied' }).eq('id', roomId);

    return data;
  }

  /**
   * Processes guest checkout: sets booking status to checked_out and
   * transitions the room to 'cleaning' so housekeeping can prepare it.
   */
  static async processCheckout(bookingId: string): Promise<Booking> {
    const db = await createClient();

    // Get booking with room
    const { data: booking, error: fetchError } = await db
      .from('bookings')
      .select('room_id')
      .eq('id', bookingId)
      .single();

    if (fetchError || !booking) {
      throw new Error('Booking not found');
    }

    // Update booking status
    const { data, error } = await db
      .from('bookings')
      .update({
        status: 'checked_out',
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to process checkout: ${error.message}`);
    }

    // Update room status if room was assigned
    if (booking.room_id) {
      await db
        .from('rooms')
        .update({ status: 'cleaning' })
        .eq('id', booking.room_id);
    }

    return data;
  }
}
