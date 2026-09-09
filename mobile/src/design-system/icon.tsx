import Archive from "lucide-react-native/icons/archive";
import ArrowDown from "lucide-react-native/icons/arrow-down";
import ArrowLeft from "lucide-react-native/icons/arrow-left";
import ArrowRight from "lucide-react-native/icons/arrow-right";
import Bell from "lucide-react-native/icons/bell";
import CalendarDays from "lucide-react-native/icons/calendar-days";
import Check from "lucide-react-native/icons/check";
import ChevronDown from "lucide-react-native/icons/chevron-down";
import ChevronRight from "lucide-react-native/icons/chevron-right";
import CircleHelp from "lucide-react-native/icons/circle-question-mark";
import Clock3 from "lucide-react-native/icons/clock-3";
import Copy from "lucide-react-native/icons/copy";
import Download from "lucide-react-native/icons/download";
import Ellipsis from "lucide-react-native/icons/ellipsis";
import SmilePlus from "lucide-react-native/icons/face-slightly-smiling-plus";
import FlaskConical from "lucide-react-native/icons/flask-conical";
import House from "lucide-react-native/icons/house";
import ImagePlus from "lucide-react-native/icons/image-plus";
import Layers from "lucide-react-native/icons/layers";
import List from "lucide-react-native/icons/list";
import LockKeyhole from "lucide-react-native/icons/lock-keyhole";
import Menu from "lucide-react-native/icons/menu";
import MessageSquare from "lucide-react-native/icons/message-square";
import Mic from "lucide-react-native/icons/mic";
import Minus from "lucide-react-native/icons/minus";
import Moon from "lucide-react-native/icons/moon";
import Pencil from "lucide-react-native/icons/pencil";
import Plus from "lucide-react-native/icons/plus";
import Reply from "lucide-react-native/icons/reply";
import Search from "lucide-react-native/icons/search";
import Settings from "lucide-react-native/icons/settings";
import Settings2 from "lucide-react-native/icons/settings-2";
import Shield from "lucide-react-native/icons/shield";
import Square from "lucide-react-native/icons/square";
import SquareCheck from "lucide-react-native/icons/square-check";
import Sun from "lucide-react-native/icons/sun";
import Target from "lucide-react-native/icons/target";
import Trash from "lucide-react-native/icons/trash";
import Users from "lucide-react-native/icons/users";
import Waves from "lucide-react-native/icons/waves-horizontal";
import X from "lucide-react-native/icons/x";
import type { ReactElement } from "react";
import { useTheme } from "./theme";
import { geometry } from "./tokens";

const icons = {
	list: List,
	microphone: Mic,
	stop: Square,
	checkboxChecked: SquareCheck,
	more: Ellipsis,
	reply: Reply,
	trash: Trash,
	image: ImagePlus,
	reaction: SmilePlus,
	archive: Archive,
	copy: Copy,
	download: Download,
	edit: Pencil,
	chevronDown: ChevronDown,
	arrowDown: ArrowDown,
	arrowLeft: ArrowLeft,
	arrowRight: ArrowRight,
	bell: Bell,
	calendar: CalendarDays,
	check: Check,
	chevron: ChevronRight,
	help: CircleHelp,
	clock: Clock3,
	lab: FlaskConical,
	home: House,
	layers: Layers,
	lock: LockKeyhole,
	message: MessageSquare,
	menu: Menu,
	minus: Minus,
	moon: Moon,
	plus: Plus,
	search: Search,
	settings: Settings2,
	gear: Settings,
	shield: Shield,
	sun: Sun,
	target: Target,
	users: Users,
	waves: Waves,
	close: X,
};
export type IconName = keyof typeof icons;
type Props = {
	name: IconName;
	tone?:
		| "primary"
		| "secondary"
		| "contrast"
		| "onAccent"
		| "onDanger"
		| "success"
		| "warning"
		| "pending"
		| "danger";
	size?: "sm" | "md";
};
export const Icon = ({
	name,
	tone = "primary",
	size = "md",
}: Props): ReactElement => {
	const theme = useTheme();
	const Glyph = icons[name];
	return (
		<Glyph
			size={size === "sm" ? geometry.iconSmall : geometry.icon}
			color={
				tone === "success" ||
				tone === "warning" ||
				tone === "danger" ||
				tone === "pending"
					? theme[tone].foreground
					: tone === "onAccent"
						? theme.accent.foreground
						: tone === "onDanger"
							? theme.dangerAction.foreground
							: theme.text[tone]
			}
			strokeWidth={geometry.iconStroke}
			accessible={false}
		/>
	);
};
