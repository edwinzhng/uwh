import Activity from "lucide-react-native/icons/activity";
import Archive from "lucide-react-native/icons/archive";
import ArrowDown from "lucide-react-native/icons/arrow-down";
import ArrowLeft from "lucide-react-native/icons/arrow-left";
import ArrowRight from "lucide-react-native/icons/arrow-right";
import ArrowUp from "lucide-react-native/icons/arrow-up";
import Backpack from "lucide-react-native/icons/backpack";
import Bell from "lucide-react-native/icons/bell";
import CalendarClock from "lucide-react-native/icons/calendar-clock";
import CalendarDays from "lucide-react-native/icons/calendar-days";
import ChartColumn from "lucide-react-native/icons/chart-column";
import Check from "lucide-react-native/icons/check";
import ChevronDown from "lucide-react-native/icons/chevron-down";
import ChevronRight from "lucide-react-native/icons/chevron-right";
import CircleHelp from "lucide-react-native/icons/circle-question-mark";
import ClipboardCheck from "lucide-react-native/icons/clipboard-check";
import Clock3 from "lucide-react-native/icons/clock-3";
import Copy from "lucide-react-native/icons/copy";
import CreditCard from "lucide-react-native/icons/credit-card";
import Download from "lucide-react-native/icons/download";
import Ellipsis from "lucide-react-native/icons/ellipsis";
import Eye from "lucide-react-native/icons/eye";
import EyeOff from "lucide-react-native/icons/eye-off";
import Smile from "lucide-react-native/icons/face-slightly-smiling";
import SmilePlus from "lucide-react-native/icons/face-slightly-smiling-plus";
import FileText from "lucide-react-native/icons/file-text";
import House from "lucide-react-native/icons/house";
import ImagePlus from "lucide-react-native/icons/image-plus";
import Layers from "lucide-react-native/icons/layers";
import List from "lucide-react-native/icons/list";
import LockKeyhole from "lucide-react-native/icons/lock-keyhole";
import LogOut from "lucide-react-native/icons/log-out";
import MapPin from "lucide-react-native/icons/map-pin";
import Megaphone from "lucide-react-native/icons/megaphone";
import Menu from "lucide-react-native/icons/menu";
import MessageSquare from "lucide-react-native/icons/message-square";
import Mic from "lucide-react-native/icons/mic";
import Minus from "lucide-react-native/icons/minus";
import Monitor from "lucide-react-native/icons/monitor";
import Moon from "lucide-react-native/icons/moon";
import Pencil from "lucide-react-native/icons/pencil";
import Pin from "lucide-react-native/icons/pin";
import Play from "lucide-react-native/icons/play";
import Plus from "lucide-react-native/icons/plus";
import Reply from "lucide-react-native/icons/reply";
import Search from "lucide-react-native/icons/search";
import Settings from "lucide-react-native/icons/settings";
import Settings2 from "lucide-react-native/icons/settings-2";
import Shield from "lucide-react-native/icons/shield";
import ShieldCheck from "lucide-react-native/icons/shield-check";
import Square from "lucide-react-native/icons/square";
import SquareCheck from "lucide-react-native/icons/square-check";
import Star from "lucide-react-native/icons/star";
import Sun from "lucide-react-native/icons/sun";
import Target from "lucide-react-native/icons/target";
import Trash from "lucide-react-native/icons/trash";
import Trophy from "lucide-react-native/icons/trophy";
import UserRound from "lucide-react-native/icons/user-round";
import Users from "lucide-react-native/icons/users";
import Video from "lucide-react-native/icons/video";
import X from "lucide-react-native/icons/x";
import type { ReactElement } from "react";
import { useTheme } from "./theme";
import { geometry } from "./tokens";

const icons = {
	video: Video,
	document: FileText,
	payments: CreditCard,
	moderation: ShieldCheck,
	equipment: Backpack,
	attendance: ClipboardCheck,
	crocodile: Shield,
	activity: Activity,
	star: Star,
	barChart: ChartColumn,
	pin: Pin,
	mapPin: MapPin,
	trophy: Trophy,
	list: List,
	microphone: Mic,
	stop: Square,
	checkboxChecked: SquareCheck,
	more: Ellipsis,
	eye: Eye,
	eyeOff: EyeOff,
	reply: Reply,
	trash: Trash,
	image: ImagePlus,
	reaction: SmilePlus,
	smile: Smile,
	archive: Archive,
	copy: Copy,
	download: Download,
	edit: Pencil,
	chevronDown: ChevronDown,
	arrowDown: ArrowDown,
	arrowUp: ArrowUp,
	arrowLeft: ArrowLeft,
	arrowRight: ArrowRight,
	bell: Bell,
	megaphone: Megaphone,
	signOut: LogOut,
	calendar: CalendarDays,
	calendarClock: CalendarClock,
	check: Check,
	chevron: ChevronRight,
	help: CircleHelp,
	clock: Clock3,
	lab: ChartColumn,
	home: House,
	layers: Layers,
	lock: LockKeyhole,
	message: MessageSquare,
	menu: Menu,
	minus: Minus,
	moon: Moon,
	plus: Plus,
	play: Play,
	search: Search,
	settings: Settings2,
	gear: Settings,
	shield: Shield,
	sun: Sun,
	monitor: Monitor,
	target: Target,
	users: Users,
	user: UserRound,
	waves: ChartColumn,
	close: X,
};
export type IconName = keyof typeof icons;
type Props = {
	name: IconName;
	tone?:
		| "primary"
		| "secondary"
		| "contrast"
		| "onBrand"
		| "onAccent"
		| "onDanger"
		| "success"
		| "warning"
		| "pending"
		| "danger";
	size?: "sm" | "md" | "feature";
	color?: string;
};
export const Icon = ({
	name,
	tone = "primary",
	size = "md",
	color,
}: Props): ReactElement => {
	const theme = useTheme();
	const dimension =
		size === "feature"
			? geometry.avatar
			: size === "sm"
				? geometry.iconSmall
				: geometry.icon;
	const Glyph = icons[name];
	return (
		<Glyph
			style={{ position: "relative" }}
			size={dimension}
			color={
				color ??
				(tone === "success" ||
				tone === "warning" ||
				tone === "danger" ||
				tone === "pending"
					? theme[tone].foreground
					: tone === "onBrand"
						? theme.brand.foreground
						: tone === "onAccent"
							? theme.accent.foreground
							: tone === "onDanger"
								? theme.dangerAction.foreground
								: theme.text[tone])
			}
			fill="none"
			strokeWidth={geometry.iconStroke}
			strokeLinecap="square"
			strokeLinejoin="miter"
			aria-hidden
		/>
	);
};
