#include <iostream>
#include <vector>
#include <random>
#include "SmartPointer.h"
#include "GCObject.h"
#include "GarbageCollector.h"

class Node : public GCObject {
public:
    int id;
    SmartPointer<Node> next;
    SmartPointer<Node> prev;

    Node(int node_id) : id(node_id) {
        std::cout << "[Sim] Created Node #" << id << "\n";
    }

    ~Node() override {
        std::cout << "[Sim] Destroyed Node #" << id << "\n";
    }
};

void runGarbageCollectorSimulation(int total_steps, int max_active_nodes) {
    std::cout << "=== Starting Garbage Collector Simulation ===\n\n";

    std::vector<SmartPointer<Node>> root_pointers;
    std::mt19937 rng(1337); 
    std::uniform_int_distribution<int> action_dist(0, 3);

    for (int step = 1; step <= total_steps; ++step) {
        std::cout << "--- Step " << step << " ---\n";
        int action = action_dist(rng);

        switch (action) {
            case 0: { // Allocate new node
                if (root_pointers.size() < static_cast<size_t>(max_active_nodes)) {
                    SmartPointer<Node> newNode(new Node(step));
                    root_pointers.push_back(newNode);
                }
                break;
            }
            case 1: { // Link pointers
                if (root_pointers.size() >= 2) {
                    size_t idx1 = rng() % root_pointers.size();
                    size_t idx2 = rng() % root_pointers.size();
                    if (idx1 != idx2) {
                        root_pointers[idx1]->next = root_pointers[idx2];
                        std::cout << "[Sim] Linked Node " << root_pointers[idx1]->id 
                                  << " -> Node " << root_pointers[idx2]->id << "\n";
                    }
                }
                break;
            }
            case 2: { // Drop root pointer
                if (!root_pointers.empty()) {
                    size_t idx = rng() % root_pointers.size();
                    std::cout << "[Sim] Dropped root reference to Node " 
                              << root_pointers[idx]->id << "\n";
                    root_pointers.erase(root_pointers.begin() + idx);
                }
                break;
            }
            case 3: { // Trigger GC
                std::cout << "[Sim] Invoking GarbageCollector sweep...\n";
                GarbageCollector::getInstance().collect();
                break;
            }
        }
    }

    std::cout << "\n--- Clearing remaining root references ---\n";
    root_pointers.clear();
    GarbageCollector::getInstance().collect();

    std::cout << "\n=== Simulation Finished ===\n";
}

int main() {
    // Run a 30-step simulation with max 8 active nodes
    runGarbageCollectorSimulation(30, 8);
    return 0;
}