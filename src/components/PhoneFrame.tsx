import type { ReactNode } from 'react'
import './PhoneFrame.css'

type PhoneFrameProps = {
  children: ReactNode
}

/**
 * Constrains a screen to the width of the Figma mobile frame so the running
 * app can be compared side by side with the design.
 */
export function PhoneFrame({ children }: PhoneFrameProps) {
  return (
    <div className="phone-frame">
      <div className="phone-frame__screen">{children}</div>
    </div>
  )
}
