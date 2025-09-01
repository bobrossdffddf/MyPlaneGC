
# Aircraft 3D Models

Place your custom 3D aircraft model files in this folder to display realistic 3D aircraft in the application.

## Supported File Formats
- **GLB** (recommended) - Binary glTF format, smaller file size
- **GLTF** - Text-based glTF format with separate texture files
- **OBJ** - Wavefront OBJ format (basic support)

## File Naming Convention
Name your model files exactly as the aircraft type appears in the dropdown:
- `A320.glb` for Airbus A320
- `B737-800.glb` for Boeing 737-800
- `B777-300.gltf` for Boeing 777-300

## Model Requirements
- Keep file sizes reasonable (< 10MB recommended)
- Use realistic aircraft proportions and details
- Include proper materials and textures
- Orient aircraft facing right (positive X direction)
- Center the model at origin (0,0,0)

## Example Aircraft Types
A318, A319, A320, A321, A330, A340, A350, A380,
B737-700, B737-800, B737-900, B747-400, B747-8, B777-200, 
B777-300, B787-8, B787-9, B787-10, CRJ-200, CRJ-700, 
CRJ-900, E170, E175, E190, DHC-8, ATR-72, MD-80, MD-90

## 3D Model Resources
- Sketchfab (free and paid models)
- TurboSquid (professional models)
- Free3D (free models)
- CGTrader (marketplace)

The system will automatically detect and load your 3D model if the filename matches the selected aircraft type. If no 3D model is found, it will fall back to the default SVG display.

## Tips for Best Results
1. Use GLB format for best performance
2. Optimize textures (1024x1024 or smaller)
3. Reduce polygon count for web performance
4. Test models in a glTF viewer before uploading
5. Ensure proper lighting and materials
