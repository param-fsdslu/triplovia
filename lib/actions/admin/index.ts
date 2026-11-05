// Barrel export — all admin actions re-exported from here
// Import via @/lib/actions/admin (resolves to this file)

export { verifyHotelAccess } from './_helpers';
export { getAdminStats, getRecentActivity } from './stats';
export {
  getAllHotels,
  getHotelById,
  createHotel,
  updateHotel,
  deleteHotel,
  updateHotelStatus,
  countFeaturedHotels,
  setHotelFeatured,
} from './hotels';
export { addHotelImage, uploadHotelImage, deleteHotelImage } from './hotel-images';
export { uploadHotelPanorama, deleteHotelPanorama } from './hotel-panoramas';
export { uploadRoomTypePanorama, deleteRoomTypePanorama } from './room-type-panoramas';
export { getAllAmenities, addHotelAmenity, removeHotelAmenity } from './hotel-amenities';
export {
  getHotelRoomTypes,
  createRoomType,
  updateRoomType,
  deleteRoomType,
} from './room-types';
export { addRoomTypeImage, uploadRoomTypeImage, deleteRoomTypeImage } from './room-type-images';
export { addRoomTypeAmenity, removeRoomTypeAmenity } from './room-type-amenities';
export {
  getAllBookings,
  getBookingDetails,
  updateBookingStatus,
  getAdminHotelsList,
  getBookingCalendar,
  type CalendarBooking,
} from './bookings';
export {
  getPayments,
  getPaymentStats,
  getPaymentDetails,
  updatePaymentStatus,
  approveRefundRequest,
  rejectRefundRequest,
} from './payments';
export {
  getHotelMealPlans,
  createMealPlan,
  updateMealPlan,
  deleteMealPlan,
} from './meal-plans';
export {
  getHotelAdminPermissions,
  updateHotelAdminPermission,
  isHotelAdminPermissionEnabled,
} from './permissions';
export {
  updateInventorySource,
  getRoomInventoryBlocks,
  createRoomInventoryBlock,
  deleteRoomInventoryBlock,
} from './inventory';
export {
  getRoomPriceRules,
  setWeekendPricing,
  createPriceOverride,
  deletePriceRule,
} from './price-rules';
