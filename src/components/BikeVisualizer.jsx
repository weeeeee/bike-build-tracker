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
                    {/* Rear Wheel - High Profile Rim */}
                    <g className="wheel" id="rear-wheel-group">
                        <circle className={getPartClass('wheelset')} cx="200" cy="350" r="100" fill="none" strokeWidth="12" stroke="currentColor" />
                        <circle className={getPartClass('wheelset')} cx="200" cy="350" r="85" fill="none" strokeWidth="2" stroke="currentColor" strokeOpacity="0.3" />
                        <g stroke="currentColor" strokeWidth="1" strokeOpacity="0.4">
                            {[...Array(12)].map((_, i) => (
                                <line key={i} x1="200" y1="350" x2={200 + 100 * Math.cos(i * Math.PI / 6)} y2={350 + 100 * Math.sin(i * Math.PI / 6)} />
                            ))}
                        </g>
                        
                        {/* Detailed Cassette */}
                        <g className={getPartClass('cassette')}>
                            <circle cx="200" cy="350" r="28" fill="currentColor" stroke="none" />
                            <circle cx="200" cy="350" r="24" fill="none" stroke="black" strokeWidth="1" />
                            <circle cx="200" cy="350" r="20" fill="none" stroke="black" strokeWidth="1" />
                            <circle cx="200" cy="350" r="16" fill="none" stroke="black" strokeWidth="1" />
                            <circle cx="200" cy="350" r="12" fill="none" stroke="black" strokeWidth="1" />
                            {/* Teeth effect */}
                            {[...Array(16)].map((_, i) => (
                                <line key={i} x1={200 + 28 * Math.cos(i * Math.PI / 8)} y1={350 + 28 * Math.sin(i * Math.PI / 8)} 
                                      x2={200 + 32 * Math.cos(i * Math.PI / 8)} y2={350 + 32 * Math.sin(i * Math.PI / 8)} 
                                      stroke="currentColor" strokeWidth="2" />
                            ))}
                        </g>

                        {/* Detailed Rear Derailleur */}
                        <g className={getPartClass('rear-derailleur')}>
                            <path d="M190,350 L175,375 L185,395" fill="none" stroke="currentColor" strokeWidth="4" />
                            <circle cx="175" cy="375" r="5" fill="currentColor" /> {/* Upper Pulley */}
                            <circle cx="185" cy="395" r="5" fill="currentColor" /> {/* Lower Pulley */}
                            <path d="M170,370 L180,380 M180,390 L190,400" stroke="currentColor" strokeWidth="1" />
                        </g>
                    </g>

                    {/* Front Wheel */}
                    <g className="wheel" id="front-wheel-group">
                        <circle className={getPartClass('wheelset')} cx="600" cy="350" r="100" fill="none" strokeWidth="12" stroke="currentColor" />
                        <circle className={getPartClass('wheelset')} cx="600" cy="350" r="85" fill="none" strokeWidth="2" stroke="currentColor" strokeOpacity="0.3" />
                        <g stroke="currentColor" strokeWidth="1" strokeOpacity="0.4">
                            {[...Array(12)].map((_, i) => (
                                <line key={i} x1="600" y1="350" x2={600 + 100 * Math.cos(i * Math.PI / 6)} y2={350 + 100 * Math.sin(i * Math.PI / 6)} />
                            ))}
                        </g>
                    </g>

                    {/* Frame - Sleek Road Geometry */}
                    <path className={getPartClass('frame')} d="M200,350 L350,350 L550,180 L320,170 Z" fill="none" strokeWidth="14" stroke="currentColor" strokeLinejoin="round" />
                    <path className={getPartClass('frame')} d="M200,350 L320,170" fill="none" strokeWidth="14" stroke="currentColor" />
                    
                    {/* Fork */}
                    <path className={getPartClass('fork')} d="M550,180 L600,350" fill="none" strokeWidth="10" stroke="currentColor" />

                    {/* Handlebars & Stem - Road Drop Bars */}
                    <path className={getPartClass('stem')} d="M550,180 L575,165" fill="none" strokeWidth="10" stroke="currentColor" />
                    <path className={getPartClass('handlebars')} d="M575,165 Q610,165 610,195 Q610,215 580,215" fill="none" strokeWidth="8" stroke="currentColor" strokeLinecap="round" />

                    {/* Seat & Seatpost */}
                    <line className={getPartClass('seat-post')} x1="320" y1="170" x2="310" y2="120" strokeWidth="8" stroke="currentColor" />
                    <path className={getPartClass('seat')} d="M280,120 L340,120 Q350,120 340,110 L290,110 Q280,110 280,120 Z" />

                    {/* Crank & BB */}
                    <circle className={getPartClass('bottom-bracket')} cx="350" cy="350" r="18" fill="none" stroke="currentColor" strokeWidth="2" />
                    <circle className={getPartClass('bottom-bracket')} cx="350" cy="350" r="12" fill="currentColor" />
                    
                    <g className={getPartClass('crank')}>
                        <line x1="350" y1="350" x2="350" y2="430" strokeWidth="12" stroke="currentColor" strokeLinecap="round" />
                        <rect x="330" y="430" width="40" height="12" rx="6" />
                        {/* Chainring detail */}
                        <circle cx="350" cy="350" r="35" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray="2,2" />
                    </g>

                    {/* Chain */}
                    <path className={getPartClass('chain')} d="M200,350 L350,315 L350,385 L200,378 Z" fill="none" strokeWidth="2" stroke="currentColor" strokeDasharray="4,4" />

                    {/* Detailed Front Derailleur */}
                    <g className={getPartClass('front-derailleur')}>
                        <path d="M355,320 L375,320 L375,345" fill="none" stroke="currentColor" strokeWidth="3" />
                        <rect x="355" y="320" width="15" height="5" rx="1" fill="currentColor" />
                    </g>

                    {/* Headset */}
                    <rect className={getPartClass('headset')} x="535" y="170" width="30" height="20" rx="2" transform="rotate(-30 550 180)" />
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
