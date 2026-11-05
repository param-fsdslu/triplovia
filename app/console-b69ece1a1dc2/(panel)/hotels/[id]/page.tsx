import { getHotelById, getHotelRoomTypes, getHotelMealPlans } from '@/lib/actions/admin'
import { getRoomInventoryBlocks } from '@/lib/actions/admin/inventory'
import { getRoomPriceRules } from '@/lib/actions/admin/price-rules'
import { HotelForm } from '@/components/admin/HotelForm'
import { HotelImagesManager } from '@/components/admin/HotelImagesManager'
import { PanoramasManager } from '@/components/admin/PanoramasManager'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { HotelAmenitiesManager } from '@/components/admin/HotelAmenitiesManager'
import { RoomTypesManager } from '@/components/admin/RoomTypesManager'
import { MealPlansManager } from '@/components/admin/MealPlansManager'
import { RoomInventoryManager } from '@/components/admin/RoomInventoryManager'
import { RoomPricingManager } from '@/components/admin/RoomPricingManager'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { redirect } from 'next/navigation'
import { ADMIN_PATH } from '@/lib/config/admin-path'

export default async function EditHotelPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [result, roomTypesResult, mealPlansResult, inventoryBlocksResult, priceRulesResult] = await Promise.all([
    getHotelById(id),
    getHotelRoomTypes(id),
    getHotelMealPlans(id),
    getRoomInventoryBlocks(id),
    getRoomPriceRules(id),
  ])

  if (!result.success || !result.hotel) {
    redirect(`${ADMIN_PATH}/hotels`)
  }

  const hotel = result.hotel
  const roomTypes = roomTypesResult.success ? roomTypesResult.roomTypes : []
  const mealPlans = mealPlansResult.success ? mealPlansResult.mealPlans : []
  const inventoryBlocks = inventoryBlocksResult.success ? inventoryBlocksResult.blocks ?? [] : []
  const priceRules = priceRulesResult.success ? priceRulesResult.rules ?? [] : []

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Edit Hotel" description={hotel.name} backHref={`${ADMIN_PATH}/hotels`} />

      <Tabs defaultValue="details" className="w-full">
        <TabsList>
          <TabsTrigger value="details">Hotel Details</TabsTrigger>
          <TabsTrigger value="rooms">Room Types</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
          <TabsTrigger value="images">Images</TabsTrigger>
          <TabsTrigger value="amenities">Amenities</TabsTrigger>
          <TabsTrigger value="meals">Meal Plans</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Hotel Information</CardTitle>
              <CardDescription>
                Update hotel details and settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <HotelForm hotel={hotel} isEdit={true} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rooms" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Room Types</CardTitle>
              <CardDescription>
                Manage room types, pricing, and availability for this hotel
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RoomTypesManager hotelId={hotel.id} hotelName={hotel.name} roomTypes={roomTypes} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Room Inventory</CardTitle>
              <CardDescription>
                Choose between manual inventory control or API auto-sync mode. Block rooms from availability for specific date ranges.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RoomInventoryManager
                hotelId={hotel.id}
                inventorySource={hotel.inventory_source ?? 'manual'}
                roomTypes={roomTypes.map((rt: any) => ({
                  id: rt.id,
                  name: rt.name,
                  num_available_rooms: rt.num_available_rooms ?? 0,
                }))}
                blocks={inventoryBlocks}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pricing" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Dynamic Pricing</CardTitle>
              <CardDescription>
                Set weekend pricing and festival/long-weekend/custom date-range pricing for each room type.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RoomPricingManager
                hotelId={hotel.id}
                roomTypes={roomTypes.map((rt: any) => ({
                  id: rt.id,
                  name: rt.name,
                  base_price: rt.base_price ?? 0,
                }))}
                rules={priceRules}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="images" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Hotel Images</CardTitle>
              <CardDescription>
                Manage hotel photos and image gallery
              </CardDescription>
            </CardHeader>
            <CardContent>
              <HotelImagesManager
                hotelId={hotel.id}
                images={hotel.hotel_images || []}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>360° Panoramas</CardTitle>
              <CardDescription>
                Panoramic photos guests can look around in, shown in the hotel page's 360° viewer
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PanoramasManager
                owner={{ type: 'hotel', id: hotel.id }}
                hotelName={hotel.name}
                panoramas={hotel.hotel_panoramas || []}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="amenities" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Hotel Amenities</CardTitle>
              <CardDescription>
                Manage facilities and services available at this hotel
              </CardDescription>
            </CardHeader>
            <CardContent>
              <HotelAmenitiesManager
                hotelId={hotel.id}
                currentAmenities={hotel.hotel_amenities || []}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="meals" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Meal Plans</CardTitle>
              <CardDescription>
                Manage breakfast, lunch, and dinner options for guests
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MealPlansManager hotelId={hotel.id} mealPlans={mealPlans} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
