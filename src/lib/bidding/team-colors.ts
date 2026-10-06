/** Stable accent per estimating crew — visual ID only; avatars unchanged. */

export type TeamColorTokens = {
  hex: string;
  dot: string;
  border: string;
  bg: string;
  text: string;
  bar: string;
};

const TEAM_COLOR_PALETTE: TeamColorTokens[] = [
  {
    hex: "#5bade8",
    dot: "bg-[#5bade8]",
    border: "border-[#5bade8]",
    bg: "bg-[#e8f4fc]",
    text: "text-[#1e6a9a]",
    bar: "bg-[#5bade8]",
  },
  {
    hex: "#e8893a",
    dot: "bg-[#e8893a]",
    border: "border-[#e8893a]",
    bg: "bg-[#fdf3e9]",
    text: "text-[#a15c1a]",
    bar: "bg-[#e8893a]",
  },
  {
    hex: "#059669",
    dot: "bg-[#059669]",
    border: "border-[#059669]",
    bg: "bg-[#ecfdf5]",
    text: "text-[#047857]",
    bar: "bg-[#059669]",
  },
  {
    hex: "#7c9cff",
    dot: "bg-[#7c9cff]",
    border: "border-[#7c9cff]",
    bg: "bg-[#eef1ff]",
    text: "text-[#3d52a0]",
    bar: "bg-[#7c9cff]",
  },
  {
    hex: "#c48ad4",
    dot: "bg-[#c48ad4]",
    border: "border-[#c48ad4]",
    bg: "bg-[#f6eef9]",
    text: "text-[#6b3d7a]",
    bar: "bg-[#c48ad4]",
  },
  {
    hex: "#e07a7a",
    dot: "bg-[#e07a7a]",
    border: "border-[#e07a7a]",
    bg: "bg-[#fceeee]",
    text: "text-[#9a3d3d]",
    bar: "bg-[#e07a7a]",
  },
];

const UNASSIGNED: TeamColorTokens = {
  hex: "#9ca3af",
  dot: "bg-ink/25",
  border: "border-ink/15",
  bg: "bg-ink/[0.04]",
  text: "text-ink/45",
  bar: "bg-ink/20",
};

export function teamColorForId(teamId: number | null | undefined): TeamColorTokens {
  if (teamId == null || !Number.isFinite(Number(teamId))) return UNASSIGNED;
  const idx = Math.abs(Math.trunc(Number(teamId))) % TEAM_COLOR_PALETTE.length;
  return TEAM_COLOR_PALETTE[idx]!;
}
