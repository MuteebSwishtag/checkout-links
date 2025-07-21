import { useState } from 'react'
// import "@/ReactJs/Components/toggleSmall.css";

import '@/Components/toggleSmall.css'

import React from "react";
export const Toggle = ({ label, toggled, onClick }) => {

    return (
        <div id='customToggleTwo'>
            <label>
                {/* checked is the real setup */}
                <input type="checkbox" checked={toggled} onChange={onClick} />
                <span />
                <strong>{label}</strong>
            </label>
        </div>
    )
}
export default Toggle;
