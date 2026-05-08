import React from 'react';

const BikeVisualizer = ({ components = [], isComplete = false }) => {
    // Check if a specific component type is "filled" (has a name)
    const isFilled = (type) => {
        const comp = components.find(c => c.type === type);
        return comp && comp.name && comp.name.trim() !== '';
    };

    const getPartClass = (type) => {
        return `bike-part ${isFilled(type) ? 'filled' : ''}`;
    };

    return (
        <div className={`visualizer-container ${isComplete ? 'riding' : ''}`}>
            <svg className="bike-svg" viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg">
                <g className="bike-group">
                    {/* Rear Wheel */}
                    <g className="wheel" id="rear-wheel-group">
                        <circle className={getPartClass('wheelset')} cx="200" cy="350" r="100" fill="none" strokeWidth="10" stroke="currentColor" />
                        <circle className={getPartClass('wheelset')} cx="200" cy="350" r="90" fill="none" strokeWidth="2" stroke="currentColor" />
                        <line className={getPartClass('wheelset')} x1="200" y1="250" x2="200" y2="450" stroke="currentColor" />
                        <line className={getPartClass('wheelset')} x1="100" y1="350" x2="300" y2="350" stroke="currentColor" />
                        {/* Cassette */}
                        <circle className={getPartClass('cassette')} cx="200" cy="350" r="25" />
                    </g>

                    {/* Front Wheel */}
                    <g className="wheel" id="front-wheel-group">
                        <circle className={getPartClass('wheelset')} cx="600" cy="350" r="100" fill="none" strokeWidth="10" stroke="currentColor" />
                        <circle className={getPartClass('wheelset')} cx="600" cy="350" r="90" fill="none" strokeWidth="2" stroke="currentColor" />
                        <line className={getPartClass('wheelset')} x1="600" y1="250" x2="600" y2="450" stroke="currentColor" />
                        <line className={getPartClass('wheelset')} x1="500" y1="350" x2="700" y2="350" stroke="currentColor" />
                    </g>

                    {/* Frame */}
                    <path className={getPartClass('frame')} d="M200,350 L350,350 L550,180 L320,180 Z" fill="none" strokeWidth="15" stroke="currentColor" strokeLinejoin="round" />
                    <path className={getPartClass('frame')} d="M200,350 L320,180" fill="none" strokeWidth="15" stroke="currentColor" />
                    
                    {/* Fork */}
                    <path className={getPartClass('fork')} d="M550,180 L600,350" fill="none" strokeWidth="12" stroke="currentColor" />

                    {/* Handlebars & Stem */}
                    <path className={getPartClass('stem')} d="M550,180 L570,160" fill="none" strokeWidth="10" stroke="currentColor" />
                    <path className={getPartClass('handlebars')} d="M570,160 Q600,160 600,190" fill="none" strokeWidth="10" stroke="currentColor" />

                    {/* Seat & Seatpost */}
                    <line className={getPartClass('seat-post')} x1="320" y1="180" x2="300" y2="130" strokeWidth="10" stroke="currentColor" />
                    <path className={getPartClass('seat')} d="M270,130 L330,130 Q340,130 330,120 L280,120 Q270,120 270,130 Z" />

                    {/* Crank & BB */}
                    <circle className={getPartClass('bottom-bracket')} cx="350" cy="350" r="15" />
                    <line className={getPartClass('crank')} x1="350" y1="350" x2="350" y2="420" strokeWidth="12" stroke="currentColor" />
                    <rect className={getPartClass('crank')} x="330" y="420" width="40" height="10" rx="5" />

                    {/* Chain */}
                    <path className={getPartClass('chain')} d="M200,350 L350,335 L350,365 L200,375 Z" fill="none" strokeWidth="3" stroke="currentColor" strokeDasharray="5,5" />

                    {/* Derailleurs */}
                    <circle className={getPartClass('rear-derailleur')} cx="180" cy="370" r="10" />
                    <circle className={getPartClass('front-derailleur')} cx="360" cy="330" r="8" />

                    {/* Headset */}
                    <rect className={getPartClass('headset')} x="535" y="170" width="30" height="15" rx="2" transform="rotate(-30 550 180)" />
                </g>
            </svg>
            
            {isComplete && (
                <div style={{ position: 'absolute', bottom: '20px', color: 'var(--accent)', fontWeight: 'bold', fontSize: '1.2rem' }}>
                    READY TO RIDE! 🚲💨
                </div>
            )}
        </div>
    );
};

export default BikeVisualizer;
