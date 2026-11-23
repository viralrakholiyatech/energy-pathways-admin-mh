const Logo = ({ collapsed = false, light = false }) => (
  <span title="MH State Energy Calculator" className={"font-bold tracking-tight " + (collapsed ? "text-xs whitespace-normal leading-tight " : "text-[17px] ") + (light ? "text-gray-900" : "text-white")}>
    {collapsed ? <>MH State Energy Calculator</> : "MH State Energy Calculator"}
  </span>
);
export default Logo;
