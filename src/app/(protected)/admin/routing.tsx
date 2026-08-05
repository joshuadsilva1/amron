import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, Pressable, PanResponder, ScrollView, TouchableOpacity, Dimensions } from "react-native";
import Alert from "@/utils/alert";
import Svg, { Path, Defs, Marker, Polygon } from "react-native-svg";
import api from "@/services/api";

interface Department { id: string; name: string; level: number; }
interface Connection { id: string; fromId: string; toId: string; }
interface NodePosition { x: number; y: number; }

export default function RoutingEditorScreen() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  
  const [selectedNode, setSelectedNode] = useState<Department | null>(null);
  const [nodePositions, setNodePositions] = useState<{ [key: string]: NodePosition }>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  // Sized to fit the actual diagram instead of a fixed 3000x3000 — on a
  // small department count that used to mean panning through mostly-empty
  // space to find anything, especially bad on a phone screen.
  const [canvasSize, setCanvasSize] = useState({ width: 1200, height: 600 });

  // We use a ref to safely store the starting X coordinate for centering 
  // without risking stale closures during drag events.
  const startXRef = useRef(50);

  useEffect(() => {
    fetchRoutingData();
  }, []);

  const fetchRoutingData = async () => {
    try {
      const deptRes = await api.get("/departments/");
      const fetchedDepts = deptRes.data?.data || deptRes.data || [];
      
      const normalizedDepts = fetchedDepts.map((d: any) => ({
        ...d,
        level: d.department_level ?? d.level ?? 0
      }));
      setDepartments(normalizedDepts);
      
      const connRes = await api.get("/admin/routing/");
      const fetchedRoutes = connRes.data?.data || [];
      setConnections(fetchedRoutes);
      
      // --- Centering Math ---
      const levels = Array.from(new Set(normalizedDepts.map((d: Department) => d.level))).sort((a: any, b: any) => a - b);
      const maxLevel = levels.length > 0 ? Math.max(...(levels as number[])) : 0;
      
      const screenWidth = Dimensions.get("window").width;
      const columnSpacing = 280;
      const nodeWidth = 160;
      const totalContentWidth = (maxLevel * columnSpacing) + nodeWidth;
      
      // If the content is smaller than the screen, divide the remaining space perfectly in half.
      // Otherwise, give it a standard 50px padding on the left.
      const calculatedStartX = totalContentWidth < screenWidth 
        ? (screenWidth - totalContentWidth) / 2 
        : 50;
        
      startXRef.current = calculatedStartX;

      // --- Layout Grid ---
      const initialPositions: { [key: string]: NodePosition } = {};
      
      levels.forEach((level: any) => {
        const levelDepts = normalizedDepts.filter((d: Department) => d.level === level);
        levelDepts.forEach((dept: Department, index: number) => {
          initialPositions[dept.id] = {
            x: startXRef.current + (level * columnSpacing),     
            y: 50 + (index * 120),     
          };
        });
      });
      
      setNodePositions(initialPositions);
      setHasUnsavedChanges(false);

      // Fit the canvas to whatever was actually laid out, with a floor so
      // it never shrinks below one screen width/height.
      const positionValues = Object.values(initialPositions);
      const maxX = positionValues.length > 0 ? Math.max(...positionValues.map((p) => p.x)) : 0;
      const maxY = positionValues.length > 0 ? Math.max(...positionValues.map((p) => p.y)) : 0;
      setCanvasSize({
        width: Math.max(screenWidth, maxX + nodeWidth + 100),
        height: Math.max(600, maxY + 64 + 100),
      });
    } catch (error) {
      console.error("Fetch error:", error);
      Alert.alert("Error", "Failed to fetch routing data.");
    }
  };

  const handleDragEnd = (deptId: string) => {
    setNodePositions(prevPositions => {
      const currentPos = prevPositions[deptId];
      if (!currentPos) return prevPositions;

      // Use the dynamically calculated startX to figure out which column they dropped it in
      const startX = startXRef.current;
      const newLevel = Math.max(0, Math.round((currentPos.x - startX) / 280));
      
      const snappedX = startX + (newLevel * 280);

      setDepartments(prevDepts => 
        prevDepts.map(d => d.id === deptId ? { ...d, level: newLevel } : d)
      );
      
      setHasUnsavedChanges(true);

      return {
        ...prevPositions,
        [deptId]: { ...currentPos, x: snappedX }
      };
    });
  };

  const handleNodeTap = (dept: Department) => {
    if (!selectedNode) {
      setSelectedNode(dept);
      return;
    }

    if (selectedNode.id === dept.id) {
      setSelectedNode(null);
      return;
    }

    const levelDiff = dept.level - selectedNode.level;
    if (levelDiff < 0) {
      Alert.alert("Invalid Route", "Stock cannot flow backwards.");
      setSelectedNode(null);
      return;
    }
    if (levelDiff > 1) {
      Alert.alert("Invalid Route", "Cannot jump layers.");
      setSelectedNode(null);
      return;
    }
    
    const exists = connections.find(c => c.fromId === selectedNode.id && c.toId === dept.id);
    if (exists) {
      setConnections(prev => prev.filter(c => c.id !== exists.id));
    } else {
      const newConnection = {
        id: `draft-${Date.now()}`,
        fromId: selectedNode.id,
        toId: dept.id
      };
      setConnections(prev => [...prev, newConnection]);
    }

    setHasUnsavedChanges(true);
    setSelectedNode(null);
  };

  const handleSave = async () => {
    setIsProcessing(true);
    try {
      const payload = {
        departments: departments.map(d => ({ id: d.id, level: d.level })),
        routes: connections.map(c => ({ from_department_id: c.fromId, to_department_id: c.toId }))
      };

      await api.post("/admin/routing/sync", payload);
      
      setHasUnsavedChanges(false);
      Alert.alert("Success", "Routing board saved successfully!");
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to save board state.");
    } finally {
      setIsProcessing(false);
    }
  };

  const getDeptName = (id: string) => departments.find(d => d.id === id)?.name || "Unknown";

  const renderLines = () => {
    return connections.map((conn) => {
      const fromPos = nodePositions[conn.fromId];
      const toPos = nodePositions[conn.toId];
      if (!fromPos || !toPos) return null;

      const fromX = fromPos.x + 160; 
      const fromY = fromPos.y + 32;  
      const toX = toPos.x;
      const toY = toPos.y + 32;

      const controlX = fromX + (toX - fromX) / 2;
      const d = `M ${fromX} ${fromY} C ${controlX} ${fromY}, ${controlX} ${toY}, ${toX} ${toY}`;

      return (
        <Path key={conn.id} d={d} stroke="#94A3B8" strokeWidth="3" fill="none" markerEnd="url(#arrow)" />
      );
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Routing Flow Editor</Text>
          <Text style={styles.subtitle}>Drag cells to change layers. Tap two cells to connect.</Text>
        </View>
        
        <TouchableOpacity 
          style={[styles.saveButton, (!hasUnsavedChanges || isProcessing) && styles.saveButtonDisabled]} 
          onPress={handleSave}
          disabled={!hasUnsavedChanges || isProcessing}
        >
          <Text style={styles.saveButtonText}>
            {isProcessing ? "Saving..." : "Save Changes"}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal bounces={false} style={styles.scrollWrapper}>
        <ScrollView bounces={false} contentContainerStyle={[styles.canvas, canvasSize]}>
          <View style={StyleSheet.absoluteFill}>
            <Svg width={canvasSize.width} height={canvasSize.height}>
              <Defs>
                <Marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                  <Polygon points="0,0 10,5 0,10" fill="#94A3B8" />
                </Marker>
              </Defs>
              {renderLines()}
            </Svg>
          </View>

          {departments.map((dept) => {
            const isSelected = selectedNode?.id === dept.id;
            const pos = nodePositions[dept.id] || { x: 0, y: 0 };

            return (
              <DraggableNode
                key={dept.id}
                dept={dept}
                position={pos}
                isSelected={isSelected}
                onPress={() => handleNodeTap(dept)}
                onDrag={(dx: number, dy: number) => {
                  setNodePositions(prev => ({
                    ...prev,
                    [dept.id]: { x: prev[dept.id].x + dx, y: prev[dept.id].y + dy }
                  }));
                }}
                onDragEnd={() => handleDragEnd(dept.id)}
              />
            );
          })}
        </ScrollView>
      </ScrollView>

      {/* --- TEXT REPRESENTATION FOOTER --- */}
      <View style={styles.footer}>
        <Text style={styles.footerTitle}>Active Routes ({connections.length})</Text>
        <ScrollView style={styles.footerList}>
          {connections.length === 0 ? (
            <Text style={styles.emptyText}>No routes established.</Text>
          ) : (
            connections.map(c => (
              <View key={c.id} style={styles.routeItem}>
                <Text style={styles.routeText}>{getDeptName(c.fromId)}</Text>
                <Text style={styles.routeArrow}> ➔ </Text>
                <Text style={styles.routeText}>{getDeptName(c.toId)}</Text>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
}

// --- Sub-Component for Draggable Behavior ---
const DraggableNode = ({ dept, position, isSelected, onPress, onDrag, onDragEnd }: any) => {
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
      },
      onPanResponderMove: (evt, gestureState) => {
        onDrag(gestureState.dx - gestureState.dx0, gestureState.dy - gestureState.dy0);
        gestureState.dx0 = gestureState.dx;
        gestureState.dy0 = gestureState.dy;
      },
      onPanResponderRelease: () => {
        onDragEnd();
      }
    })
  ).current;

  return (
    <View
      {...panResponder.panHandlers}
      style={[
        styles.nodeWrapper,
        { left: position.x, top: position.y }
      ]}
    >
      <Pressable style={[styles.node, isSelected && styles.nodeSelected]} onPress={onPress}>
        <Text style={[styles.nodeText, isSelected && styles.nodeTextSelected]}>{dept.name}</Text>
        <Text style={styles.levelBadge}>Layer {dept.level + 1}</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" }, 
  header: { 
    padding: 24, 
    backgroundColor: "#FFFFFF", 
    borderBottomWidth: 1, 
    borderBottomColor: "#E5E7EB",
    zIndex: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  title: { fontSize: 24, fontWeight: "700", color: "#111827" }, 
  subtitle: { fontSize: 14, color: "#6B7280", marginTop: 4 },
  
  saveButton: {
    backgroundColor: "#4F46E5",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  saveButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
  },

  scrollWrapper: { flex: 1 },
  canvas: { position: "relative" },
  
  nodeWrapper: { position: "absolute", width: 160, height: 64 },
  node: {
    flex: 1, backgroundColor: "#FFFFFF", borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB",
    justifyContent: "center", alignItems: "center", shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 3, 
  },
  nodeSelected: {
    borderColor: "#6366F1", borderWidth: 2, backgroundColor: "#EEF2FF", shadowOpacity: 0.15,
  },
  nodeText: { fontSize: 14, fontWeight: "600", color: "#374151" }, 
  nodeTextSelected: { color: "#4338CA" }, 
  levelBadge: { fontSize: 10, color: "#9CA3AF", marginTop: 4, textTransform: "uppercase", fontWeight: "700" },

  // Footer Styles
  footer: {
    height: 180,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 10,
  },
  footerTitle: { fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 12 },
  footerList: { flex: 1 },
  routeItem: { flexDirection: "row", alignItems: "center", marginBottom: 8, backgroundColor: "#F3F4F6", padding: 12, borderRadius: 8 },
  routeText: { fontSize: 14, fontWeight: "600", color: "#374151" },
  routeArrow: { fontSize: 14, color: "#9CA3AF", marginHorizontal: 8 },
  emptyText: { color: "#9CA3AF", fontStyle: "italic", marginTop: 8 }
});