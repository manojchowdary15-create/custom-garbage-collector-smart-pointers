#include <iostream>
#include <vector>
#include <random>


#include "include/SmartPointer.h"
#include "include/GCObject.h"
#include "include/GarbageCollector.h"

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

    // Fixed seed so the simulation gives the same result every time
    std::mt19937 rng(1337);

    std::uniform_int_distribution<int> action_dist(0, 3);

    for (int step = 1; step <= total_steps; ++step) {

        std::cout << "--- Step " << step << " ---\n";

        int action = action_dist(rng);

        switch (action) {

            // ==========================================
            // CASE 0: CREATE NEW NODE
            // ==========================================
            case 0: {

                if (root_pointers.size() <
                    static_cast<size_t>(max_active_nodes)) {

                    SmartPointer<Node> newNode(new Node(step));

                    root_pointers.push_back(newNode);
                }

                break;
            }

            // ==========================================
            // CASE 1: LINK TWO NODES
            // ==========================================
            case 1: {

                if (root_pointers.size() >= 2) {

                    size_t idx1 = rng() % root_pointers.size();
                    size_t idx2 = rng() % root_pointers.size();

                    if (idx1 != idx2) {

                        root_pointers[idx1]->next =
                            root_pointers[idx2];

                        std::cout
                            << "[Sim] Linked Node "
                            << root_pointers[idx1]->id
                            << " -> Node "
                            << root_pointers[idx2]->id
                            << "\n";
                    }
                }

                break;
            }

            // ==========================================
            // CASE 2: REMOVE ROOT POINTER
            // ==========================================
            case 2: {

                if (!root_pointers.empty()) {

                    size_t idx =
                        rng() % root_pointers.size();

                    std::cout
                        << "[Sim] Dropped root reference to Node "
                        << root_pointers[idx]->id
                        << "\n";

                    root_pointers.erase(
                        root_pointers.begin() + idx
                    );
                }

                break;
            }

            // ==========================================
            // CASE 3: RUN GARBAGE COLLECTOR
            // ==========================================
            case 3: {

                std::cout
                    << "[Sim] Invoking GarbageCollector sweep...\n";

                // IMPORTANT:
                // getInstance() is assumed to return a pointer
                GarbageCollector::getInstance().collect();

                break;
            }
        }
    }

    // ==============================================
    // CLEAR ALL ROOT REFERENCES
    // ==============================================

    std::cout
        << "\n--- Clearing remaining root references ---\n";

    root_pointers.clear();

    // Run garbage collection one final time
    GarbageCollector::getInstance().collect();

    std::cout
        << "\n=== Simulation Finished ===\n";
}

int main() {

    // Run a 30-step simulation
    // Maximum 8 active root nodes

    runGarbageCollectorSimulation(30, 8);

    return 0;
}