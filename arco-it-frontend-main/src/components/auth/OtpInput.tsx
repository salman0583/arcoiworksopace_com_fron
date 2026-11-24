import React, { useRef, useEffect } from 'react';

interface OtpInputProps {
  value: string;
  onChange: (otp: string) => void;
  onComplete?: (otp: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}

export const OtpInput: React.FC<OtpInputProps> = ({
  value,
  onChange,
  onComplete,
  disabled = false,
  autoFocus = true,
}) => {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] || '');

  useEffect(() => {
    if (autoFocus && inputRefs.current[0] && !disabled) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus, disabled]);

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (disabled) return;
    const pastedData = e.clipboardData.getData('text');
    const cleanDigits = pastedData.replace(/\D/g, '').slice(0, 6);
    if (!cleanDigits) return;

    onChange(cleanDigits);

    // Focus the box after the last pasted digit or the last box (index 5)
    const focusTarget = Math.min(cleanDigits.length, 5);
    inputRefs.current[focusTarget]?.focus();

    if (cleanDigits.length === 6 && onComplete) {
      onComplete(cleanDigits);
    }
  };

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const cleanDigits = rawVal.replace(/\D/g, '');

    // Multi-digit entry scenario (e.g. mobile browser SMS autofill, drag-and-drop, or fast input)
    if (cleanDigits.length > 1) {
      const fullOtp = cleanDigits.slice(0, 6);
      onChange(fullOtp);
      const focusTarget = Math.min(fullOtp.length, 5);
      inputRefs.current[focusTarget]?.focus();
      if (fullOtp.length === 6 && onComplete) {
        onComplete(fullOtp);
      }
      return;
    }

    const digit = cleanDigits.slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    const newOtp = newDigits.join('');
    onChange(newOtp);

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newOtp.length === 6 && onComplete) {
      onComplete(newOtp);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        // Current slot is empty, backspace into previous slot
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        onChange(newDigits.join(''));
        inputRefs.current[index - 1]?.focus();
      } else {
        const newDigits = [...digits];
        newDigits[index] = '';
        onChange(newDigits.join(''));
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleFocus = (index: number) => {
    inputRefs.current[index]?.select();
  };

  return (
    <div
      style={{
        display: 'flex',
        gap: '8px',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        margin: '6px 0',
      }}
    >
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => (inputRefs.current[index] = el)}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          maxLength={6}
          value={digit}
          disabled={disabled}
          onPaste={handlePaste}
          onChange={(e) => handleChange(index, e)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onFocus={() => handleFocus(index)}
          aria-label={`Digit ${index + 1} of 6`}
          style={{
            width: '46px',
            height: '52px',
            textAlign: 'center',
            fontSize: '22px',
            fontWeight: 700,
            fontFamily: 'Consolas, monospace',
            color: '#172033',
            backgroundColor: disabled ? '#F5F7FA' : '#FFFFFF',
            border: digit ? '1.5px solid #2563EB' : '1.5px solid #E5E9F0',
            borderRadius: '8px',
            outline: 'none',
            boxShadow: 'var(--shadow-sm)',
            transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
            cursor: disabled ? 'not-allowed' : 'text',
          }}
          onFocusCapture={(e) => {
            e.currentTarget.style.borderColor = '#2563EB';
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.15)';
          }}
          onBlurCapture={(e) => {
            e.currentTarget.style.borderColor = digit ? '#2563EB' : '#E5E9F0';
            e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
          }}
        />
      ))}
    </div>
  );
};
