import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function BaseIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      {props.children}
    </svg>
  );
}

export function HomeIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4 11.5 12 5l8 6.5V20H4z" />
      <path d="M9.5 20v-5.5h5V20" />
    </BaseIcon>
  );
}

export function BookIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M6 4.5h9.5a2 2 0 0 1 2 2V19.5H8a2 2 0 0 0-2 2z" />
      <path d="M6 4.5A2.5 2.5 0 0 0 3.5 7V19A2.5 2.5 0 0 0 6 21.5h11.5" />
      <path d="M9 8.5h5.5" />
      <path d="M9 12h5.5" />
    </BaseIcon>
  );
}

export function PrepIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M8 4.5h10.5v15H8z" />
      <path d="M8 8.5H5.5v11H16" />
      <path d="M11 9h4.5" />
      <path d="M11 12.5h4.5" />
      <path d="M11 16h3" />
    </BaseIcon>
  );
}

export function ShieldIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 3.5 5 6.5V12c0 4 2.7 7.6 7 8.5 4.3-.9 7-4.5 7-8.5V6.5z" />
      <path d="m8.5 12 2.2 2.2 4.8-5" />
    </BaseIcon>
  );
}

export function DocumentIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M6 4.5h12v15H6z" />
      <path d="M9 8.5h6" />
      <path d="M9 12h6" />
      <path d="M9 15.5h4" />
    </BaseIcon>
  );
}

export function StarIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 4.5 14.5 9.5 20 10.2l-4 3.8.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.8 5.5-.7z" />
    </BaseIcon>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="11" cy="11" r="5.5" />
      <path d="m15 15 4.5 4.5" />
    </BaseIcon>
  );
}
