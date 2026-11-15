import { useState, type InputHTMLAttributes } from 'react'

export function PasswordInput({
  className,
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const [show, setShow] = useState(false)
  return (
    <span className="pwbox">
      <input
        {...rest}
        className={className ? `${className} pwin` : 'pwin'}
        type={show ? 'text' : 'password'}
        autoCapitalize="off"
        spellCheck={false}
      />
      <button
        type="button"
        className="pweye"
        aria-label={show ? '비밀번호 숨기기' : '비밀번호 보기'}
        aria-pressed={show}
        onClick={() => setShow((v) => !v)}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
          <circle cx="12" cy="12" r="3" />
          {show ? null : <path d="M4 20 20 4" />}
        </svg>
      </button>
    </span>
  )
}
