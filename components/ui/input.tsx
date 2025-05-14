import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> { }

export function Input(props: InputProps) {
    return (
        <input
            {...props}
            className={`w-full px-4 py-2 rounded-lg outline-none ${props.className || ''}`}
        />
    );
} 