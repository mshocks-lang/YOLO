# YOLO - Prototype 1 Specification

## Game Type
Top-down escape simulation.

## Core Premise
The player starts in Central City already being pursued by police. The objective is to escape Central City without being apprehended.

---

## Scope Restrictions

- One player vehicle sprite
- One police vehicle sprite
- One city map
- No fuel system yet
- No save system yet
- No audio yet
- No menus yet

---

## Player Vehicle

### Movement
- Top-down driving mechanics
- Maximum speed: 189.5 MPH

### Damage System
- Vehicle damage meter: 0% to 100%
- At 100% damage: vehicle becomes disabled
- Disabled vehicle immediately results in apprehension
- **Run ends**

---

## Police System

### Capabilities
- One police vehicle type
- Police designed to feel competent and threatening
- Can pursue at speeds near 200 MPH
- Prioritize containment before apprehension
- Attempt to maintain visual contact with player

---

## Containment System

### Mechanics
- Major city exits can become blocked
- Roadblocks spawn on key roads
- Police attempt to prevent the player from leaving the city

---

## Pursuit States

### SEARCH
- Police actively searching for player
- No visual contact

### PURSUIT
- Police have visual contact with player
- Active chase underway

---

## Game Over Conditions

1. Vehicle damage reaches 100%
2. Police successfully apprehend player

---

## HUD Layout

### Top Left
```
STATUS
SEARCH or PURSUIT
```

### Top Right
```
DAMAGE %
```

### Bottom Right
```
CURRENT DISTRICT
```

---

## Event Screens

### MINOR EVENT
```
ROADBLOCK ESTABLISHED
```

### SUB-MAJOR EVENT
```
CITY EXIT LOCKDOWN
```

### MAJOR APPREHENSION
```
YOU WERE CAUGHT
```

---

## Success Condition

Player exits Central City boundaries.

### Victory Display
```
SUB-MAJOR EVENT

CENTRAL CITY ESCAPED
```

---

## Vehicle Sprites

### Player Vehicle
- White sport/escape vehicle
- Top-down perspective
- Red interior accents

### Police Vehicle
- Black patrol vehicle
- Top-down perspective
- Blue and red emergency lights visible on roof

---

## Prototype Goal

**Determine whether escaping a city against a competent containment-focused police force is fun and challenging.**

### Key Design Questions
- Does the containment system create meaningful strategic decisions?
- Is the police AI challenging without feeling unfair?
- Does the damage system create tension and consequence?
- Is the escape fantasy satisfying?

---

## Technical Requirements

- Single city map (Central City)
- Player vehicle physics and control
- Police AI with:
  - Visual detection system
  - Pathfinding to maintain contact
  - Containment strategy (blocking exits)
- Damage tracking and vehicle state management
- District tracking for HUD
- Event trigger system for roadblocks and lockdowns
- Boundary detection for city escape
