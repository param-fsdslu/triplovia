/**
 * Boat booking service — parallel to BookingService but for boat/trip bookings.
 *
 * Key differences from hotel bookings:
 * - Reference format is BB-YYYYMMDD-XXXX (not BK-)
 * - Supports two pricing models: per_person (with optional child pricing) and per_boat
 * - userId is optional — guest bookings (no account) are supported
 * - No room assignment or checkout flow (single-day trips only)
 * - Booking is created with booking_status = 'confirmed' (not pending, since trips
 *   are confirmed immediately; payment_status remains 'pending' until Razorpay verifies)
 */
import { createClient } from '@/lib/db/server';
import type {
  BoatBooking,
  BoatBookingWithDetails,
  BoatBookingStatus,
  PricingModel,
} from '@/lib/types';

export class BoatBookingService {
  /**
   * Generates a unique boat booking reference in the format BB-YYYYMMDD-XXXX.
   * Uses random alphanumeric suffix; callers should handle potential collisions.
   */
  private static generateBookingReference(): string {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `BB-${dateStr}-${randomStr}`;
  }

  /**
   * Calculates the price breakdown for a boat booking.
   * For per_person: adult price × adults + (child price ?? adult price) × children.
   * For per_boat: flat price_per_boat regardless of passenger count.
   * Tax defaults to 12% GST if not supplied by the trip type.
   */
  static calculateTotals(params: {
    pricingModel: PricingModel;
    pricePerPerson?: number;
    pricePerBoat?: number;
    childPricePerPerson?: number;
    numAdults: number;
    numChildren: number;
    taxPercentage?: number;
  }) {
    let subtotal: number;

    if (params.pricingModel === 'per_person') {
      const adultTotal = (params.pricePerPerson || 0) * params.numAdults;
      const childPrice = params.childPricePerPerson ?? params.pricePerPerson ?? 0;
      const childTotal = childPrice * params.numChildren;
      subtotal = adultTotal + childTotal;
    } else {
      subtotal = params.pricePerBoat || 0;
    }

    const taxPercentage = params.taxPercentage || 12;
    const taxAmount = Math.round((subtotal * taxPercentage) / 100);
    const serviceFee = 0;
    const totalAmount = subtotal + taxAmount + serviceFee;

    return {
      subtotal,
      taxAmount,
      taxPercentage,
      serviceFee,
      totalAmount,
    };
  }

  /**
   * Inserts a new boat booking row. Accepts pre-calculated totals (calculated
   * server-side via calculateTotals before calling this). Returns the created BoatBooking.
   */
  static async createBooking(
    bookingData: {
      userId?: string;
      boatId: string;
      tripTypeId: string;
      timeSlotId: string;
      tripDate: string;
      numAdults: number;
      numChildren: number;
      guestFirstName: string;
      guestLastName: string;
      guestEmail: string;
      guestPhone: string;
      pricingModel: PricingModel;
      pricePerPerson?: number;
      pricePerBoat?: number;
      childPricePerPerson?: number;
      subtotal: number;
      taxAmount: number;
      serviceFee: number;
      totalAmount: number;
      specialRequests?: string;
    }
  ): Promise<BoatBooking> {
    const db = await createClient();

    const bookingReference = this.generateBookingReference();

    const { data: booking, error } = await db
      .from('boat_bookings')
      .insert({
        booking_reference: bookingReference,
        user_id: bookingData.userId || null,
        boat_id: bookingData.boatId,
        trip_type_id: bookingData.tripTypeId,
        time_slot_id: bookingData.timeSlotId,
        trip_date: bookingData.tripDate,
        num_adults: bookingData.numAdults,
        num_children: bookingData.numChildren,
        guest_first_name: bookingData.guestFirstName,
        guest_last_name: bookingData.guestLastName,
        guest_email: bookingData.guestEmail,
        guest_phone: bookingData.guestPhone,
        pricing_model: bookingData.pricingModel,
        price_per_person: bookingData.pricePerPerson || null,
        price_per_boat: bookingData.pricePerBoat || null,
        child_price_per_person: bookingData.childPricePerPerson || null,
        subtotal: bookingData.subtotal,
        tax_amount: bookingData.taxAmount,
        tax_percentage: 12,
        service_fee: bookingData.serviceFee,
        discount_amount: 0,
        total_amount: bookingData.totalAmount,
        currency: 'INR',
        booking_status: 'confirmed',
        payment_status: 'pending',
        special_requests: bookingData.specialRequests || null,
        booking_source: 'web',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create boat booking: ${error.message}`);
    }

    return booking;
  }

  /**
   * Fetches a boat booking with boat, trip_type, and time_slot joins.
   * Pass userId to enforce ownership (returns null if IDs don't match).
   */
  static async getBookingById(
    bookingId: string,
    userId?: string
  ): Promise<BoatBookingWithDetails | null> {
    const db = await createClient();

    let query = db
      .from('boat_bookings')
      .select(
        `
        *,
        boat:boats(id, name, slug, city, departure_point, phone, email),
        trip_type:trip_types(id, name, duration_minutes, pricing_model),
        time_slot:trip_time_slots(id, start_time, end_time, label)
      `
      )
      .eq('id', bookingId);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query.single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to get boat booking: ${error.message}`);
    }

    return data;
  }

  /**
   * Fetches a boat booking by its human-readable reference (e.g. BB-20240115-AB12).
   * Includes includes_text from trip_type for the confirmation page.
   */
  static async getBookingByReference(
    reference: string,
    userId?: string
  ): Promise<BoatBookingWithDetails | null> {
    const db = await createClient();

    let query = db
      .from('boat_bookings')
      .select(
        `
        *,
        boat:boats(id, name, slug, city, departure_point, phone, email),
        trip_type:trip_types(id, name, duration_minutes, pricing_model, includes_text),
        time_slot:trip_time_slots(id, start_time, end_time, label)
      `
      )
      .eq('booking_reference', reference);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query.single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to get boat booking: ${error.message}`);
    }

    return data;
  }

  /**
   * Returns all boat bookings for a user, newest first.
   * Includes boat thumbnail images for list card rendering.
   */
  static async getUserBookings(userId: string): Promise<BoatBookingWithDetails[]> {
    const db = await createClient();

    const { data, error } = await db
      .from('boat_bookings')
      .select(
        `
        *,
        boat:boats(id, name, slug, city, departure_point, boat_images(image_url, is_primary)),
        trip_type:trip_types(id, name, duration_minutes),
        time_slot:trip_time_slots(id, start_time, end_time, label)
      `
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get user boat bookings: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Updates booking_status and sets cancelled_at when the new status is 'cancelled'.
   */
  static async updateBookingStatus(
    bookingId: string,
    status: BoatBookingStatus
  ): Promise<BoatBooking> {
    const db = await createClient();

    const updateData: any = {
      booking_status: status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'cancelled') {
      updateData.cancelled_at = new Date().toISOString();
    }

    const { data, error } = await db
      .from('boat_bookings')
      .update(updateData)
      .eq('id', bookingId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update boat booking: ${error.message}`);
    }

    return data;
  }

  /**
   * Cancels a boat booking after verifying ownership and current status.
   * Stores the optional cancellation reason. Refund logic is handled separately.
   */
  static async cancelBooking(
    bookingId: string,
    userId: string,
    reason?: string
  ): Promise<BoatBooking> {
    const db = await createClient();

    const { data: booking, error: fetchError } = await db
      .from('boat_bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (fetchError || !booking) {
      throw new Error('Boat booking not found');
    }

    if (booking.user_id !== userId) {
      throw new Error('Unauthorized to cancel this booking');
    }

    if (booking.booking_status === 'cancelled') {
      throw new Error('Booking is already cancelled');
    }

    if (booking.booking_status === 'completed') {
      throw new Error('Cannot cancel a completed booking');
    }

    const { data, error } = await db
      .from('boat_bookings')
      .update({
        booking_status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to cancel boat booking: ${error.message}`);
    }

    return data;
  }
}
