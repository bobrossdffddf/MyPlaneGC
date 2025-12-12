# PTFS Ground Control

## Overview

PTFS Ground Control is a web-based ground operations management application for the PTFS (Pilot Training Flight Simulator) Roblox game, specifically designed for the ATC24 private server community. The application provides real-time aircraft tracking, ground crew coordination, stand/gate management, and permit documentation for airport ground operations.

The system integrates with the ATC24 data API to receive live aircraft telemetry and displays interactive airport management interfaces with support for multiple airports, aircraft types, and ground service vehicles.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with Vite as the build tool
- **Styling**: Custom CSS with modern glassmorphism design patterns
- **3D Models**: Google Model Viewer for aircraft 3D visualization (GLB/GLTF support)
- **Real-time Communication**: Socket.io-client for WebSocket connections
- **Build Strategy**: Code splitting with manual chunks for vendor (React) and socket libraries

### Backend Architecture
- **Runtime**: Node.js with ES Modules
- **Framework**: Express.js serving both static files and API endpoints
- **Real-time Layer**: Socket.io server for bi-directional communication with clients
- **External Data**: WebSocket client (ws library) connecting to ATC24 data API at `https://24data.ptfs.app`

### Authentication System
- **Provider**: Discord OAuth2 via Passport.js
- **Session Management**: Express-session with configurable cookie settings
- **Strategy**: passport-discord for Discord identity verification
- **Scope**: Basic user identification (`identify` scope)

### Data Sources
- **Primary API**: ATC24 REST API (`GET /acft-data`, `GET /atis`) with rate limiting considerations
- **WebSocket Feed**: Real-time aircraft data stream including position, heading, altitude, speed, and ground status
- **Static Configuration**: Airport stand/gate configurations defined in `src/airportConfig.js`

### Airport Configuration
- Multi-airport support with detailed stand definitions
- Stand properties include: type, capacity, terminal assignment, jetway availability, special requirements
- Aircraft categorization: narrow-body, wide-body, super-heavy, cargo, helicopter
- Special handling for A380-capable gates with multiple jetways

### Asset Management
- **3D Models**: `/aircraft_models/` directory for GLB/GLTF aircraft models
- **SVG Graphics**: `/aircraft_svgs/` directory for 2D aircraft representations
- **Fallback System**: Automatic fallback from 3D models to SVG when models unavailable

## External Dependencies

### Third-Party Services
- **Discord OAuth**: Authentication provider requiring `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, and `DISCORD_CALLBACK_URL` environment variables
- **ATC24 Data API**: External REST/WebSocket API at `https://24data.ptfs.app` providing real-time flight data from PTFS game servers

### Environment Variables Required
- `SESSION_SECRET`: Express session encryption key
- `DISCORD_CLIENT_ID`: Discord application client ID
- `DISCORD_CLIENT_SECRET`: Discord application secret
- `DISCORD_CALLBACK_URL`: OAuth callback URL

### Key NPM Dependencies
- `express`: Web server framework
- `socket.io` / `socket.io-client`: Real-time bidirectional communication
- `passport` / `passport-discord`: Authentication middleware
- `ws`: WebSocket client for external API connection
- `dotenv`: Environment variable management

## Ground Crew Manager (GCM) Mode

### Overview
Ground Crew Manager mode is a privileged administrative interface for managing ground crew operations at airports. Access is restricted to the certified owner only.

### Access Control
- **Owner Discord ID**: `848356730256883744`
- **Server-side verification**: All GCM socket handlers verify the caller's authenticated session from `connectedUsers` map
- **No client-side trust**: Manager identity is derived exclusively from server-verified session data
- **Security model**: Prevents privilege escalation by rejecting unauthenticated or unauthorized socket requests

### Features
1. **Online Crew Tab**: View all online ground crew members with their callsigns, usernames, and current assignments
2. **Gate Manager Tab**: Interactive gate/stand management with occupancy status
3. **Assignment System**: Assign crew to teams, planes, or gates with popup notifications
4. **Removal System**: Remove crew members from service with system notifications

### Socket Events
- `joinGcmMode`: Owner joins GCM mode (triggers manager online notification to ground crew)
- `leaveGcmMode`: Owner leaves GCM mode
- `gcmAssignToCrew`: Assign crew member to a team
- `gcmAssignToPlane`: Assign crew member to service a specific aircraft
- `gcmAssignToGate`: Assign crew member to a specific gate
- `gcmRemoveFromCrew`: Remove crew member from service

### Recent Changes (December 2025)
- Implemented server-side access control for all GCM handlers
- Removed fallback to client-supplied user identifiers
- Manager and target user metadata now derived from server-verified `connectedUsers` data
- Added popup notifications for ground crew when manager comes online or issues assignments