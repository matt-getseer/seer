import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement> {
  label: string;
  error?: string;
  multiline?: boolean;
  rows?: number;
}

const Input: React.FC<InputProps> = ({
  label,
  error,
  multiline = false,
  rows = 4,
  className = '',
  ...props
}) => {
  const baseClasses = "mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500";
  const inputClasses = error
    ? `${baseClasses} border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500`
    : `${baseClasses}`;

  const InputComponent = multiline ? 'textarea' : 'input';

  return (
    <div>
      <label htmlFor={props.id} className="block text-sm font-medium text-gray-700">
        {label}
        {props.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="relative">
        <InputComponent
          {...props}
          rows={multiline ? rows : undefined}
          className={`${inputClasses} ${className}`}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${props.id}-error` : undefined}
        />
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600" id={`${props.id}-error`}>
          {error}
        </p>
      )}
    </div>
  );
};

export default Input; 