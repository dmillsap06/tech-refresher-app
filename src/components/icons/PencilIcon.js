import React from "react";

const PencilIcon = ({ className = "", ...props }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
    width="1em"
    height="1em"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M16.862 3.487a2.06 2.06 0 012.915 2.915L6.75 19.43a2 2 0 01-.878.516l-3.155.89a.5.5 0 01-.621-.621l.89-3.155a2 2 0 01.516-.878L16.862 3.487z"
    />
  </svg>
);

export default PencilIcon;