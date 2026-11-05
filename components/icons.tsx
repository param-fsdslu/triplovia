/**
 * The app's icons: solid Phosphor icons (https://phosphoricons.com) under the Lucide names the code
 * already used, so `import { Mail } from '@/components/icons'` gives a filled envelope. Shape icons
 * use Phosphor's "fill" weight; pure line glyphs (X, check, plus, minus, menu, dots, spinner, editor
 * toolbar) use "bold", because their fill versions sit inside a filled square. Icons come from
 * Phosphor's SSR build, one file each, so they work in server and client components and only the
 * icons listed here are bundled. Default size 24px like Lucide; a size class (h-4 w-4, size-4) wins.
 *
 * Add new icons here (the Phosphor equivalent, imported as Ph…) instead of importing lucide-react,
 * so the whole app stays solid. A component can still pass weight="regular" etc. to override.
 */
import { forwardRef } from 'react'
import type { Icon, IconProps, IconWeight } from '@phosphor-icons/react'
import { AirplaneIcon as PhAirplane } from '@phosphor-icons/react/dist/ssr/Airplane'
import { AnchorIcon as PhAnchor } from '@phosphor-icons/react/dist/ssr/Anchor'
import { ArchiveIcon as PhArchive } from '@phosphor-icons/react/dist/ssr/Archive'
import { ArrowCounterClockwiseIcon as PhArrowCounterClockwise } from '@phosphor-icons/react/dist/ssr/ArrowCounterClockwise'
import { ArrowLeftIcon as PhArrowLeft } from '@phosphor-icons/react/dist/ssr/ArrowLeft'
import { ArrowRightIcon as PhArrowRight } from '@phosphor-icons/react/dist/ssr/ArrowRight'
import { ArrowSquareOutIcon as PhArrowSquareOut } from '@phosphor-icons/react/dist/ssr/ArrowSquareOut'
import { ArrowUUpLeftIcon as PhArrowUUpLeft } from '@phosphor-icons/react/dist/ssr/ArrowUUpLeft'
import { ArrowUUpRightIcon as PhArrowUUpRight } from '@phosphor-icons/react/dist/ssr/ArrowUUpRight'
import { ArrowUpRightIcon as PhArrowUpRight } from '@phosphor-icons/react/dist/ssr/ArrowUpRight'
import { ArrowsCounterClockwiseIcon as PhArrowsCounterClockwise } from '@phosphor-icons/react/dist/ssr/ArrowsCounterClockwise'
import { ArrowsDownUpIcon as PhArrowsDownUp } from '@phosphor-icons/react/dist/ssr/ArrowsDownUp'
import { ArrowsInIcon as PhArrowsIn } from '@phosphor-icons/react/dist/ssr/ArrowsIn'
import { ArrowsOutIcon as PhArrowsOut } from '@phosphor-icons/react/dist/ssr/ArrowsOut'
import { ArrowsOutCardinalIcon as PhArrowsOutCardinal } from '@phosphor-icons/react/dist/ssr/ArrowsOutCardinal'
import { BabyIcon as PhBaby } from '@phosphor-icons/react/dist/ssr/Baby'
import { BarbellIcon as PhBarbell } from '@phosphor-icons/react/dist/ssr/Barbell'
import { BathtubIcon as PhBathtub } from '@phosphor-icons/react/dist/ssr/Bathtub'
import { BedIcon as PhBed } from '@phosphor-icons/react/dist/ssr/Bed'
import { BellIcon as PhBell } from '@phosphor-icons/react/dist/ssr/Bell'
import { BicycleIcon as PhBicycle } from '@phosphor-icons/react/dist/ssr/Bicycle'
import { BoatIcon as PhBoat } from '@phosphor-icons/react/dist/ssr/Boat'
import { BookOpenIcon as PhBookOpen } from '@phosphor-icons/react/dist/ssr/BookOpen'
import { BookmarkSimpleIcon as PhBookmarkSimple } from '@phosphor-icons/react/dist/ssr/BookmarkSimple'
import { BuildingIcon as PhBuilding } from '@phosphor-icons/react/dist/ssr/Building'
import { BuildingApartmentIcon as PhBuildingApartment } from '@phosphor-icons/react/dist/ssr/BuildingApartment'
import { BuildingsIcon as PhBuildings } from '@phosphor-icons/react/dist/ssr/Buildings'
import { BusIcon as PhBus } from '@phosphor-icons/react/dist/ssr/Bus'
import { CalendarIcon as PhCalendar } from '@phosphor-icons/react/dist/ssr/Calendar'
import { CalendarBlankIcon as PhCalendarBlank } from '@phosphor-icons/react/dist/ssr/CalendarBlank'
import { CalendarCheckIcon as PhCalendarCheck } from '@phosphor-icons/react/dist/ssr/CalendarCheck'
import { CalendarDotsIcon as PhCalendarDots } from '@phosphor-icons/react/dist/ssr/CalendarDots'
import { CalendarSlashIcon as PhCalendarSlash } from '@phosphor-icons/react/dist/ssr/CalendarSlash'
import { CalendarXIcon as PhCalendarX } from '@phosphor-icons/react/dist/ssr/CalendarX'
import { CameraIcon as PhCamera } from '@phosphor-icons/react/dist/ssr/Camera'
import { CarIcon as PhCar } from '@phosphor-icons/react/dist/ssr/Car'
import { CaretDownIcon as PhCaretDown } from '@phosphor-icons/react/dist/ssr/CaretDown'
import { CaretLeftIcon as PhCaretLeft } from '@phosphor-icons/react/dist/ssr/CaretLeft'
import { CaretRightIcon as PhCaretRight } from '@phosphor-icons/react/dist/ssr/CaretRight'
import { CaretUpIcon as PhCaretUp } from '@phosphor-icons/react/dist/ssr/CaretUp'
import { ChartBarIcon as PhChartBar } from '@phosphor-icons/react/dist/ssr/ChartBar'
import { ChatCircleIcon as PhChatCircle } from '@phosphor-icons/react/dist/ssr/ChatCircle'
import { ChatTextIcon as PhChatText } from '@phosphor-icons/react/dist/ssr/ChatText'
import { CheckIcon as PhCheck } from '@phosphor-icons/react/dist/ssr/Check'
import { CheckCircleIcon as PhCheckCircle } from '@phosphor-icons/react/dist/ssr/CheckCircle'
import { ChefHatIcon as PhChefHat } from '@phosphor-icons/react/dist/ssr/ChefHat'
import { CircleIcon as PhCircle } from '@phosphor-icons/react/dist/ssr/Circle'
import { CircleNotchIcon as PhCircleNotch } from '@phosphor-icons/react/dist/ssr/CircleNotch'
import { ClockIcon as PhClock } from '@phosphor-icons/react/dist/ssr/Clock'
import { CloudCheckIcon as PhCloudCheck } from '@phosphor-icons/react/dist/ssr/CloudCheck'
import { CoffeeIcon as PhCoffee } from '@phosphor-icons/react/dist/ssr/Coffee'
import { CompassIcon as PhCompass } from '@phosphor-icons/react/dist/ssr/Compass'
import { CopyIcon as PhCopy } from '@phosphor-icons/react/dist/ssr/Copy'
import { CreditCardIcon as PhCreditCard } from '@phosphor-icons/react/dist/ssr/CreditCard'
import { CubeIcon as PhCube } from '@phosphor-icons/react/dist/ssr/Cube'
import { CurrencyInrIcon as PhCurrencyInr } from '@phosphor-icons/react/dist/ssr/CurrencyInr'
import { DeviceMobileIcon as PhDeviceMobile } from '@phosphor-icons/react/dist/ssr/DeviceMobile'
import { DogIcon as PhDog } from '@phosphor-icons/react/dist/ssr/Dog'
import { DotsThreeVerticalIcon as PhDotsThreeVertical } from '@phosphor-icons/react/dist/ssr/DotsThreeVertical'
import { DownloadSimpleIcon as PhDownloadSimple } from '@phosphor-icons/react/dist/ssr/DownloadSimple'
import { DropIcon as PhDrop } from '@phosphor-icons/react/dist/ssr/Drop'
import { EnvelopeIcon as PhEnvelope } from '@phosphor-icons/react/dist/ssr/Envelope'
import { EnvelopeOpenIcon as PhEnvelopeOpen } from '@phosphor-icons/react/dist/ssr/EnvelopeOpen'
import { EyeIcon as PhEye } from '@phosphor-icons/react/dist/ssr/Eye'
import { EyeSlashIcon as PhEyeSlash } from '@phosphor-icons/react/dist/ssr/EyeSlash'
import { FileTextIcon as PhFileText } from '@phosphor-icons/react/dist/ssr/FileText'
import { FlameIcon as PhFlame } from '@phosphor-icons/react/dist/ssr/Flame'
import { FloppyDiskIcon as PhFloppyDisk } from '@phosphor-icons/react/dist/ssr/FloppyDisk'
import { FlowerIcon as PhFlower } from '@phosphor-icons/react/dist/ssr/Flower'
import { FlowerLotusIcon as PhFlowerLotus } from '@phosphor-icons/react/dist/ssr/FlowerLotus'
import { ForkKnifeIcon as PhForkKnife } from '@phosphor-icons/react/dist/ssr/ForkKnife'
import { FunnelIcon as PhFunnel } from '@phosphor-icons/react/dist/ssr/Funnel'
import { GearIcon as PhGear } from '@phosphor-icons/react/dist/ssr/Gear'
import { GlobeIcon as PhGlobe } from '@phosphor-icons/react/dist/ssr/Globe'
import { GridNineIcon as PhGridNine } from '@phosphor-icons/react/dist/ssr/GridNine'
import { HeadsetIcon as PhHeadset } from '@phosphor-icons/react/dist/ssr/Headset'
import { HeartIcon as PhHeart } from '@phosphor-icons/react/dist/ssr/Heart'
import { HospitalIcon as PhHospital } from '@phosphor-icons/react/dist/ssr/Hospital'
import { HouseIcon as PhHouse } from '@phosphor-icons/react/dist/ssr/House'
import { ImageIcon as PhImage } from '@phosphor-icons/react/dist/ssr/Image'
import { ImageBrokenIcon as PhImageBroken } from '@phosphor-icons/react/dist/ssr/ImageBroken'
import { ImageSquareIcon as PhImageSquare } from '@phosphor-icons/react/dist/ssr/ImageSquare'
import { ImagesIcon as PhImages } from '@phosphor-icons/react/dist/ssr/Images'
import { InfoIcon as PhInfo } from '@phosphor-icons/react/dist/ssr/Info'
import { KeyIcon as PhKey } from '@phosphor-icons/react/dist/ssr/Key'
import { LetterCirclePIcon as PhLetterCircleP } from '@phosphor-icons/react/dist/ssr/LetterCircleP'
import { LightningIcon as PhLightning } from '@phosphor-icons/react/dist/ssr/Lightning'
import { LinkIcon as PhLink } from '@phosphor-icons/react/dist/ssr/Link'
import { ListIcon as PhList } from '@phosphor-icons/react/dist/ssr/List'
import { ListBulletsIcon as PhListBullets } from '@phosphor-icons/react/dist/ssr/ListBullets'
import { ListNumbersIcon as PhListNumbers } from '@phosphor-icons/react/dist/ssr/ListNumbers'
import { LockIcon as PhLock } from '@phosphor-icons/react/dist/ssr/Lock'
import { MagnifyingGlassIcon as PhMagnifyingGlass } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass'
import { MagnifyingGlassMinusIcon as PhMagnifyingGlassMinus } from '@phosphor-icons/react/dist/ssr/MagnifyingGlassMinus'
import { MagnifyingGlassPlusIcon as PhMagnifyingGlassPlus } from '@phosphor-icons/react/dist/ssr/MagnifyingGlassPlus'
import { MapPinIcon as PhMapPin } from '@phosphor-icons/react/dist/ssr/MapPin'
import { MinusIcon as PhMinus } from '@phosphor-icons/react/dist/ssr/Minus'
import { MoneyIcon as PhMoney } from '@phosphor-icons/react/dist/ssr/Money'
import { MonitorIcon as PhMonitor } from '@phosphor-icons/react/dist/ssr/Monitor'
import { PaperPlaneTiltIcon as PhPaperPlaneTilt } from '@phosphor-icons/react/dist/ssr/PaperPlaneTilt'
import { PawPrintIcon as PhPawPrint } from '@phosphor-icons/react/dist/ssr/PawPrint'
import { PencilIcon as PhPencil } from '@phosphor-icons/react/dist/ssr/Pencil'
import { PencilSimpleIcon as PhPencilSimple } from '@phosphor-icons/react/dist/ssr/PencilSimple'
import { PhoneIcon as PhPhone } from '@phosphor-icons/react/dist/ssr/Phone'
import { PlusIcon as PhPlus } from '@phosphor-icons/react/dist/ssr/Plus'
import { PrinterIcon as PhPrinter } from '@phosphor-icons/react/dist/ssr/Printer'
import { ProhibitIcon as PhProhibit } from '@phosphor-icons/react/dist/ssr/Prohibit'
import { QuotesIcon as PhQuotes } from '@phosphor-icons/react/dist/ssr/Quotes'
import { SailboatIcon as PhSailboat } from '@phosphor-icons/react/dist/ssr/Sailboat'
import { SealCheckIcon as PhSealCheck } from '@phosphor-icons/react/dist/ssr/SealCheck'
import { ShieldIcon as PhShield } from '@phosphor-icons/react/dist/ssr/Shield'
import { ShieldCheckIcon as PhShieldCheck } from '@phosphor-icons/react/dist/ssr/ShieldCheck'
import { ShieldSlashIcon as PhShieldSlash } from '@phosphor-icons/react/dist/ssr/ShieldSlash'
import { ShieldWarningIcon as PhShieldWarning } from '@phosphor-icons/react/dist/ssr/ShieldWarning'
import { ShoppingCartIcon as PhShoppingCart } from '@phosphor-icons/react/dist/ssr/ShoppingCart'
import { SignInIcon as PhSignIn } from '@phosphor-icons/react/dist/ssr/SignIn'
import { SignOutIcon as PhSignOut } from '@phosphor-icons/react/dist/ssr/SignOut'
import { SlidersHorizontalIcon as PhSlidersHorizontal } from '@phosphor-icons/react/dist/ssr/SlidersHorizontal'
import { SnowflakeIcon as PhSnowflake } from '@phosphor-icons/react/dist/ssr/Snowflake'
import { SortAscendingIcon as PhSortAscending } from '@phosphor-icons/react/dist/ssr/SortAscending'
import { SortDescendingIcon as PhSortDescending } from '@phosphor-icons/react/dist/ssr/SortDescending'
import { SparkleIcon as PhSparkle } from '@phosphor-icons/react/dist/ssr/Sparkle'
import { SpeakerHighIcon as PhSpeakerHigh } from '@phosphor-icons/react/dist/ssr/SpeakerHigh'
import { SquaresFourIcon as PhSquaresFour } from '@phosphor-icons/react/dist/ssr/SquaresFour'
import { StarIcon as PhStar } from '@phosphor-icons/react/dist/ssr/Star'
import { StorefrontIcon as PhStorefront } from '@phosphor-icons/react/dist/ssr/Storefront'
import { SuitcaseIcon as PhSuitcase } from '@phosphor-icons/react/dist/ssr/Suitcase'
import { SunIcon as PhSun } from '@phosphor-icons/react/dist/ssr/Sun'
import { TShirtIcon as PhTShirt } from '@phosphor-icons/react/dist/ssr/TShirt'
import { TargetIcon as PhTarget } from '@phosphor-icons/react/dist/ssr/Target'
import { TelevisionIcon as PhTelevision } from '@phosphor-icons/react/dist/ssr/Television'
import { TextAlignCenterIcon as PhTextAlignCenter } from '@phosphor-icons/react/dist/ssr/TextAlignCenter'
import { TextAlignLeftIcon as PhTextAlignLeft } from '@phosphor-icons/react/dist/ssr/TextAlignLeft'
import { TextAlignRightIcon as PhTextAlignRight } from '@phosphor-icons/react/dist/ssr/TextAlignRight'
import { TextBIcon as PhTextB } from '@phosphor-icons/react/dist/ssr/TextB'
import { TextHOneIcon as PhTextHOne } from '@phosphor-icons/react/dist/ssr/TextHOne'
import { TextHThreeIcon as PhTextHThree } from '@phosphor-icons/react/dist/ssr/TextHThree'
import { TextHTwoIcon as PhTextHTwo } from '@phosphor-icons/react/dist/ssr/TextHTwo'
import { TextItalicIcon as PhTextItalic } from '@phosphor-icons/react/dist/ssr/TextItalic'
import { TextUnderlineIcon as PhTextUnderline } from '@phosphor-icons/react/dist/ssr/TextUnderline'
import { TrainIcon as PhTrain } from '@phosphor-icons/react/dist/ssr/Train'
import { TrashIcon as PhTrash } from '@phosphor-icons/react/dist/ssr/Trash'
import { TreeEvergreenIcon as PhTreeEvergreen } from '@phosphor-icons/react/dist/ssr/TreeEvergreen'
import { TreePalmIcon as PhTreePalm } from '@phosphor-icons/react/dist/ssr/TreePalm'
import { TrendDownIcon as PhTrendDown } from '@phosphor-icons/react/dist/ssr/TrendDown'
import { TrendUpIcon as PhTrendUp } from '@phosphor-icons/react/dist/ssr/TrendUp'
import { UploadSimpleIcon as PhUploadSimple } from '@phosphor-icons/react/dist/ssr/UploadSimple'
import { UserIcon as PhUser } from '@phosphor-icons/react/dist/ssr/User'
import { UserCircleIcon as PhUserCircle } from '@phosphor-icons/react/dist/ssr/UserCircle'
import { UserPlusIcon as PhUserPlus } from '@phosphor-icons/react/dist/ssr/UserPlus'
import { UsersIcon as PhUsers } from '@phosphor-icons/react/dist/ssr/Users'
import { WarningIcon as PhWarning } from '@phosphor-icons/react/dist/ssr/Warning'
import { WarningCircleIcon as PhWarningCircle } from '@phosphor-icons/react/dist/ssr/WarningCircle'
import { WashingMachineIcon as PhWashingMachine } from '@phosphor-icons/react/dist/ssr/WashingMachine'
import { WavesIcon as PhWaves } from '@phosphor-icons/react/dist/ssr/Waves'
import { WifiHighIcon as PhWifiHigh } from '@phosphor-icons/react/dist/ssr/WifiHigh'
import { WifiSlashIcon as PhWifiSlash } from '@phosphor-icons/react/dist/ssr/WifiSlash'
import { WindIcon as PhWind } from '@phosphor-icons/react/dist/ssr/Wind'
import { WineIcon as PhWine } from '@phosphor-icons/react/dist/ssr/Wine'
import { XIcon as PhX } from '@phosphor-icons/react/dist/ssr/X'
import { XCircleIcon as PhXCircle } from '@phosphor-icons/react/dist/ssr/XCircle'
import { WhatsappLogoIcon as PhWhatsappLogo } from '@phosphor-icons/react/dist/ssr/WhatsappLogo'
import { NavigationArrowIcon as PhNavigationArrow } from '@phosphor-icons/react/dist/ssr/NavigationArrow'
import { WheelchairIcon as PhWheelchair } from '@phosphor-icons/react/dist/ssr/Wheelchair'
import { ArmchairIcon as PhArmchair } from '@phosphor-icons/react/dist/ssr/Armchair'
import { BinocularsIcon as PhBinoculars } from '@phosphor-icons/react/dist/ssr/Binoculars'
import { FirstAidKitIcon as PhFirstAidKit } from '@phosphor-icons/react/dist/ssr/FirstAidKit'
import { BroomIcon as PhBroom } from '@phosphor-icons/react/dist/ssr/Broom'
import { CallBellIcon as PhCallBell } from '@phosphor-icons/react/dist/ssr/CallBell'
import { CookingPotIcon as PhCookingPot } from '@phosphor-icons/react/dist/ssr/CookingPot'
import { DeskIcon as PhDesk } from '@phosphor-icons/react/dist/ssr/Desk'
import { ElevatorIcon as PhElevator } from '@phosphor-icons/react/dist/ssr/Elevator'
import { FanIcon as PhFan } from '@phosphor-icons/react/dist/ssr/Fan'
import { FireExtinguisherIcon as PhFireExtinguisher } from '@phosphor-icons/react/dist/ssr/FireExtinguisher'
import { FishIcon as PhFish } from '@phosphor-icons/react/dist/ssr/Fish'
import { CampfireIcon as PhCampfire } from '@phosphor-icons/react/dist/ssr/Campfire'
import { GameControllerIcon as PhGameController } from '@phosphor-icons/react/dist/ssr/GameController'
import { HairDryerIcon as PhHairDryer } from '@phosphor-icons/react/dist/ssr/HairDryer'
import { HandSoapIcon as PhHandSoap } from '@phosphor-icons/react/dist/ssr/HandSoap'
import { LeafIcon as PhLeaf } from '@phosphor-icons/react/dist/ssr/Leaf'
import { LifebuoyIcon as PhLifebuoy } from '@phosphor-icons/react/dist/ssr/Lifebuoy'
import { MartiniIcon as PhMartini } from '@phosphor-icons/react/dist/ssr/Martini'
import { MountainsIcon as PhMountains } from '@phosphor-icons/react/dist/ssr/Mountains'
import { MusicNotesIcon as PhMusicNotes } from '@phosphor-icons/react/dist/ssr/MusicNotes'
import { PresentationIcon as PhPresentation } from '@phosphor-icons/react/dist/ssr/Presentation'
import { ShowerIcon as PhShower } from '@phosphor-icons/react/dist/ssr/Shower'
import { CouchIcon as PhCouch } from '@phosphor-icons/react/dist/ssr/Couch'
import { PersonSimpleSwimIcon as PhPersonSimpleSwim } from '@phosphor-icons/react/dist/ssr/PersonSimpleSwim'
import { TentIcon as PhTent } from '@phosphor-icons/react/dist/ssr/Tent'
import { ThermometerHotIcon as PhThermometerHot } from '@phosphor-icons/react/dist/ssr/ThermometerHot'
import { ToiletIcon as PhToilet } from '@phosphor-icons/react/dist/ssr/Toilet'
import { UmbrellaSimpleIcon as PhUmbrellaSimple } from '@phosphor-icons/react/dist/ssr/UmbrellaSimple'
import { UsersThreeIcon as PhUsersThree } from '@phosphor-icons/react/dist/ssr/UsersThree'
import { SwimmingPoolIcon as PhSwimmingPool } from '@phosphor-icons/react/dist/ssr/SwimmingPool'
import { InstagramLogoIcon as PhInstagramLogo } from '@phosphor-icons/react/dist/ssr/InstagramLogo'
import { FacebookLogoIcon as PhFacebookLogo } from '@phosphor-icons/react/dist/ssr/FacebookLogo'
import { YoutubeLogoIcon as PhYoutubeLogo } from '@phosphor-icons/react/dist/ssr/YoutubeLogo'
import { BankIcon as PhBank } from '@phosphor-icons/react/dist/ssr/Bank'
import { IdentificationCardIcon as PhIdentificationCard } from '@phosphor-icons/react/dist/ssr/IdentificationCard'
import { ClockCounterClockwiseIcon as PhClockCounterClockwise } from '@phosphor-icons/react/dist/ssr/ClockCounterClockwise'

/** An icon component (was Lucide's type of the same name) */
export type LucideIcon = Icon
export type LucideProps = IconProps

function withWeight(weight: IconWeight) {
  return (Base: Icon, name: string): Icon => {
    const Weighted = forwardRef<SVGSVGElement, Omit<IconProps, 'ref'>>((props, ref) => (
      <Base ref={ref} weight={weight} size={24} {...props} />
    ))
    Weighted.displayName = name
    return Weighted
  }
}

const solid = withWeight('fill')
const bold = withWeight('bold')

export const AlertCircle = solid(PhWarningCircle, 'AlertCircle')
export const AlertTriangle = solid(PhWarning, 'AlertTriangle')
export const AlignCenter = bold(PhTextAlignCenter, 'AlignCenter')
export const AlignLeft = bold(PhTextAlignLeft, 'AlignLeft')
export const AlignRight = bold(PhTextAlignRight, 'AlignRight')
export const Anchor = solid(PhAnchor, 'Anchor')
export const Archive = solid(PhArchive, 'Archive')
export const ArrowDownNarrowWide = bold(PhSortAscending, 'ArrowDownNarrowWide')
export const ArrowDownWideNarrow = bold(PhSortDescending, 'ArrowDownWideNarrow')
export const ArrowLeft = solid(PhArrowLeft, 'ArrowLeft')
export const ArrowRight = solid(PhArrowRight, 'ArrowRight')
export const ArrowUpDown = solid(PhArrowsDownUp, 'ArrowUpDown')
export const ArrowUpRight = solid(PhArrowUpRight, 'ArrowUpRight')
export const Baby = solid(PhBaby, 'Baby')
export const BadgeCheck = solid(PhSealCheck, 'BadgeCheck')
export const Ban = solid(PhProhibit, 'Ban')
export const Banknote = solid(PhMoney, 'Banknote')
export const BarChart3 = solid(PhChartBar, 'BarChart3')
export const Bath = solid(PhBathtub, 'Bath')
export const Bed = solid(PhBed, 'Bed')
export const BedDouble = solid(PhBed, 'BedDouble')
export const Bell = solid(PhBell, 'Bell')
export const Bike = solid(PhBicycle, 'Bike')
export const Bold = bold(PhTextB, 'Bold')
export const Bookmark = solid(PhBookmarkSimple, 'Bookmark')
export const BookOpen = solid(PhBookOpen, 'BookOpen')
export const Building = solid(PhBuilding, 'Building')
export const Building2 = solid(PhBuildings, 'Building2')
export const Bus = solid(PhBus, 'Bus')
export const Calendar = solid(PhCalendar, 'Calendar')
export const CalendarCheck = solid(PhCalendarCheck, 'CalendarCheck')
export const CalendarDays = solid(PhCalendarDots, 'CalendarDays')
export const CalendarIcon = solid(PhCalendar, 'CalendarIcon')
export const CalendarOff = solid(PhCalendarSlash, 'CalendarOff')
export const CalendarRange = solid(PhCalendarBlank, 'CalendarRange')
export const CalendarX2 = solid(PhCalendarX, 'CalendarX2')
export const Camera = solid(PhCamera, 'Camera')
export const Car = solid(PhCar, 'Car')
export const Check = bold(PhCheck, 'Check')
export const CheckCircle = solid(PhCheckCircle, 'CheckCircle')
export const CheckCircle2 = solid(PhCheckCircle, 'CheckCircle2')
export const CheckIcon = bold(PhCheck, 'CheckIcon')
export const ChefHat = solid(PhChefHat, 'ChefHat')
export const ChevronDown = solid(PhCaretDown, 'ChevronDown')
export const ChevronDownIcon = solid(PhCaretDown, 'ChevronDownIcon')
export const ChevronLeft = solid(PhCaretLeft, 'ChevronLeft')
export const ChevronLeftIcon = solid(PhCaretLeft, 'ChevronLeftIcon')
export const ChevronRight = solid(PhCaretRight, 'ChevronRight')
export const ChevronRightIcon = solid(PhCaretRight, 'ChevronRightIcon')
export const ChevronUp = solid(PhCaretUp, 'ChevronUp')
export const ChevronUpIcon = solid(PhCaretUp, 'ChevronUpIcon')
export const CircleIcon = solid(PhCircle, 'CircleIcon')
export const Clock = solid(PhClock, 'Clock')
export const CloudCheck = solid(PhCloudCheck, 'CloudCheck')
export const Coffee = solid(PhCoffee, 'Coffee')
export const Compass = solid(PhCompass, 'Compass')
export const Copy = solid(PhCopy, 'Copy')
export const CreditCard = solid(PhCreditCard, 'CreditCard')
export const Dog = solid(PhDog, 'Dog')
export const DollarSign = solid(PhCurrencyInr, 'DollarSign')
export const Download = solid(PhDownloadSimple, 'Download')
export const Droplets = solid(PhDrop, 'Droplets')
export const Dumbbell = solid(PhBarbell, 'Dumbbell')
export const Edit = solid(PhPencilSimple, 'Edit')
export const ExternalLink = solid(PhArrowSquareOut, 'ExternalLink')
export const Eye = solid(PhEye, 'Eye')
export const EyeOff = solid(PhEyeSlash, 'EyeOff')
export const FileText = solid(PhFileText, 'FileText')
export const Filter = solid(PhFunnel, 'Filter')
export const Flame = solid(PhFlame, 'Flame')
export const Flower2 = solid(PhFlower, 'Flower2')
export const Globe = solid(PhGlobe, 'Globe')
export const Grid3x3 = solid(PhGridNine, 'Grid3x3')
export const Heading1 = bold(PhTextHOne, 'Heading1')
export const Heading2 = bold(PhTextHTwo, 'Heading2')
export const Heading3 = bold(PhTextHThree, 'Heading3')
export const Headset = solid(PhHeadset, 'Headset')
export const Heart = solid(PhHeart, 'Heart')
export const Home = solid(PhHouse, 'Home')
export const Hospital = solid(PhHospital, 'Hospital')
export const Hotel = solid(PhBuildingApartment, 'Hotel')
export const House = solid(PhHouse, 'House')
export const Image = solid(PhImage, 'Image')
export const ImageIcon = solid(PhImage, 'ImageIcon')
export const ImageOff = solid(PhImageBroken, 'ImageOff')
export const ImagePlus = solid(PhImageSquare, 'ImagePlus')
export const Images = solid(PhImages, 'Images')
export const IndianRupee = solid(PhCurrencyInr, 'IndianRupee')
export const Info = solid(PhInfo, 'Info')
export const Italic = bold(PhTextItalic, 'Italic')
export const KeyRound = solid(PhKey, 'KeyRound')
export const LayoutDashboard = solid(PhSquaresFour, 'LayoutDashboard')
export const Link = bold(PhLink, 'Link')
export const List = bold(PhListBullets, 'List')
export const ListOrdered = bold(PhListNumbers, 'ListOrdered')
export const Loader2 = bold(PhCircleNotch, 'Loader2')
export const Lock = solid(PhLock, 'Lock')
export const LogIn = solid(PhSignIn, 'LogIn')
export const LogOut = solid(PhSignOut, 'LogOut')
export const Luggage = solid(PhSuitcase, 'Luggage')
export const Mail = solid(PhEnvelope, 'Mail')
export const MailCheck = solid(PhEnvelopeOpen, 'MailCheck')
export const MapPin = solid(PhMapPin, 'MapPin')
export const Maximize2 = solid(PhArrowsOut, 'Maximize2')
export const Menu = bold(PhList, 'Menu')
export const MessageCircle = solid(PhChatCircle, 'MessageCircle')
export const MessageSquare = solid(PhChatText, 'MessageSquare')
export const Minimize2 = solid(PhArrowsIn, 'Minimize2')
export const Minus = bold(PhMinus, 'Minus')
export const MinusIcon = bold(PhMinus, 'MinusIcon')
export const Monitor = solid(PhMonitor, 'Monitor')
export const MoreVertical = bold(PhDotsThreeVertical, 'MoreVertical')
export const Move = solid(PhArrowsOutCardinal, 'Move')
export const ParkingCircle = solid(PhLetterCircleP, 'ParkingCircle')
export const PawPrint = solid(PhPawPrint, 'PawPrint')
export const Pencil = solid(PhPencil, 'Pencil')
export const Phone = solid(PhPhone, 'Phone')
export const Plane = solid(PhAirplane, 'Plane')
export const Plus = bold(PhPlus, 'Plus')
export const Printer = solid(PhPrinter, 'Printer')
export const Quote = solid(PhQuotes, 'Quote')
export const Redo = solid(PhArrowUUpRight, 'Redo')
export const RefreshCcw = solid(PhArrowsCounterClockwise, 'RefreshCcw')
export const Rotate3d = solid(PhCube, 'Rotate3d')
export const RotateCcw = solid(PhArrowCounterClockwise, 'RotateCcw')
export const Sailboat = solid(PhSailboat, 'Sailboat')
export const Save = solid(PhFloppyDisk, 'Save')
export const Search = solid(PhMagnifyingGlass, 'Search')
export const Send = solid(PhPaperPlaneTilt, 'Send')
export const Settings = solid(PhGear, 'Settings')
export const Shield = solid(PhShield, 'Shield')
export const ShieldAlert = solid(PhShieldWarning, 'ShieldAlert')
export const ShieldCheck = solid(PhShieldCheck, 'ShieldCheck')
export const ShieldOff = solid(PhShieldSlash, 'ShieldOff')
export const Ship = solid(PhBoat, 'Ship')
export const Shirt = solid(PhTShirt, 'Shirt')
export const ShoppingCart = solid(PhShoppingCart, 'ShoppingCart')
export const SlidersHorizontal = solid(PhSlidersHorizontal, 'SlidersHorizontal')
export const Smartphone = solid(PhDeviceMobile, 'Smartphone')
export const Snowflake = solid(PhSnowflake, 'Snowflake')
export const SortAsc = bold(PhSortAscending, 'SortAsc')
export const Sparkles = solid(PhSparkle, 'Sparkles')
export const Star = solid(PhStar, 'Star')
export const Store = solid(PhStorefront, 'Store')
export const Sun = solid(PhSun, 'Sun')
export const Target = solid(PhTarget, 'Target')
export const Temple = solid(PhFlowerLotus, 'Temple')
export const Train = solid(PhTrain, 'Train')
export const Trash2 = solid(PhTrash, 'Trash2')
export const TreePalm = solid(PhTreePalm, 'TreePalm')
export const Trees = solid(PhTreeEvergreen, 'Trees')
export const TrendingDown = solid(PhTrendDown, 'TrendingDown')
export const TrendingUp = solid(PhTrendUp, 'TrendingUp')
export const Tv = solid(PhTelevision, 'Tv')
export const Underline = bold(PhTextUnderline, 'Underline')
export const Undo = solid(PhArrowUUpLeft, 'Undo')
export const Upload = solid(PhUploadSimple, 'Upload')
export const User = solid(PhUser, 'User')
export const UserCircle = solid(PhUserCircle, 'UserCircle')
export const UserPlus = solid(PhUserPlus, 'UserPlus')
export const UserRound = solid(PhUser, 'UserRound')
export const Users = solid(PhUsers, 'Users')
export const UtensilsCrossed = solid(PhForkKnife, 'UtensilsCrossed')
export const Volume2 = solid(PhSpeakerHigh, 'Volume2')
export const WashingMachine = solid(PhWashingMachine, 'WashingMachine')
export const Waves = bold(PhWaves, 'Waves')
export const Wifi = solid(PhWifiHigh, 'Wifi')
export const WifiOff = solid(PhWifiSlash, 'WifiOff')
export const Wind = solid(PhWind, 'Wind')
export const Wine = solid(PhWine, 'Wine')
export const X = bold(PhX, 'X')
export const XCircle = solid(PhXCircle, 'XCircle')
export const XIcon = bold(PhX, 'XIcon')
export const Zap = solid(PhLightning, 'Zap')
export const ZoomIn = solid(PhMagnifyingGlassPlus, 'ZoomIn')
export const ZoomOut = solid(PhMagnifyingGlassMinus, 'ZoomOut')

// Amenity and place icons (lib/utils/amenityIcons.tsx)
export const Accessibility = solid(PhWheelchair, 'Accessibility')
export const Armchair = solid(PhArmchair, 'Armchair')
export const Binoculars = solid(PhBinoculars, 'Binoculars')
export const BriefcaseMedical = solid(PhFirstAidKit, 'BriefcaseMedical')
export const Broom = solid(PhBroom, 'Broom')
export const ConciergeBell = solid(PhCallBell, 'ConciergeBell')
export const CookingPot = solid(PhCookingPot, 'CookingPot')
export const Desk = solid(PhDesk, 'Desk')
export const Elevator = solid(PhElevator, 'Elevator')
export const Fan = solid(PhFan, 'Fan')
export const FireExtinguisher = solid(PhFireExtinguisher, 'FireExtinguisher')
export const Fish = solid(PhFish, 'Fish')
export const FlameKindling = solid(PhCampfire, 'FlameKindling')
export const Gamepad2 = solid(PhGameController, 'Gamepad2')
export const HairDryer = solid(PhHairDryer, 'HairDryer')
export const HandSoap = solid(PhHandSoap, 'HandSoap')
export const Leaf = solid(PhLeaf, 'Leaf')
export const LifeBuoy = solid(PhLifebuoy, 'LifeBuoy')
export const Martini = solid(PhMartini, 'Martini')
export const Mountain = solid(PhMountains, 'Mountain')
export const Music = solid(PhMusicNotes, 'Music')
export const Presentation = solid(PhPresentation, 'Presentation')
export const ShowerHead = solid(PhShower, 'ShowerHead')
export const Sofa = solid(PhCouch, 'Sofa')
export const Swimmer = solid(PhPersonSimpleSwim, 'Swimmer')
export const Tent = solid(PhTent, 'Tent')
export const ThermometerSun = solid(PhThermometerHot, 'ThermometerSun')
export const Toilet = solid(PhToilet, 'Toilet')
export const Umbrella = solid(PhUmbrellaSimple, 'Umbrella')
export const UsersThree = solid(PhUsersThree, 'UsersThree')
export const WavesLadder = solid(PhSwimmingPool, 'WavesLadder')
export const Whatsapp = solid(PhWhatsappLogo, 'Whatsapp')
export const Instagram = solid(PhInstagramLogo, 'Instagram')
export const Facebook = solid(PhFacebookLogo, 'Facebook')
export const Youtube = solid(PhYoutubeLogo, 'Youtube')
export const Landmark = solid(PhBank, 'Landmark')
export const IdCard = solid(PhIdentificationCard, 'IdCard')
export const History = solid(PhClockCounterClockwise, 'History')
export const Navigation = solid(PhNavigationArrow, 'Navigation')
