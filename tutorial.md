# Factor10 - Simulation API Tutorial

The Factor10 API allows you to design complex production chains using JavaScript code. The system is based on physical entities placed in space (Visual, Sink, Source), products (Product), and connections (Link).

## Common Methods

Most physical entities (Visual, Sink, Source) share basic methods for positioning and appearance within the 3D scene.

* `setName(name)` : Sets the name displayed above the entity.
* `setX(value)` : Sets the position along the horizontal axis (left/right).
* `setY(value)` : Sets the position along the depth axis (forward/backward).
* `addAsset(name, offsetX, offsetZ, rotationY, scale)` : Adds a 3D model to the entity. This method can be called multiple times to combine models (for example, a truck and a pallet).
* `name` : Identifier of the 3D model (e.g., `'cube'`, `'machine'`, `'conv'`).
* `offsetX` : Horizontal offset relative to the entity’s position.
* `offsetZ` : Depth offset.
* `rotationY` : Model rotation in degrees.
* `scale` : Model scale (default is 1).

---

## 1. Visual (Environment and Decoration)

`Visual` objects are purely cosmetic. They do not interact with the simulation and are used to build the environment (floors, walls, decorations).

```javascript
// Create a floor tile
var floor = createVisual();
floor.addAsset('floor-grey', 0, 0, 0, 1);
floor.setX(0);
floor.setY(0);
```

**Specific Methods:**

* `createVisual()` : Instantiates and returns a new decorative entity.

---

## 2. Product (The Product)

A `Product` defines an item that will move through your factory. It has an economic value and a 3D appearance when traveling along links.

```javascript
// Define a processed product
var box = createProduct();
box.setName('Standard Box');
box.setPrice(15);
box.setColor('#00ffaa');
box.addAsset('box', 0, 0, 0, 0.5);
```

**Specific Methods:**

* `createProduct()` : Instantiates and returns a new product.
* `setPrice(value)` : Sets the economic value of the product. Used to calculate profit upon delivery.
* `setColor(hex)` : Applies a custom color to the 3D model (e.g., `'#ff0000'` for red).
* `addAsset(...)` : Defines the 3D model used to represent this product on conveyors.

---

## 3. Sink (Storage, Conveyor, and Delivery)

A `Sink` acts as a destination point. It can function as temporary storage (buffer), a physical conveyor, or a final delivery point.

```javascript
// Create a buffer conveyor
var buffer = createSink();
buffer.setName('Main Conveyor');
buffer.setProduct(box);
buffer.setCapacity(10);
buffer.addAsset('conv', 0, 0, 0, 1);
buffer.setX(2);
buffer.setY(0);
```

**Specific Methods:**

* `createSink()` : Instantiates and returns a new sink.
* `setProduct(product)` : Defines the exclusive product that this sink is allowed to receive.
* `setCapacity(value)` : Defines the maximum storage capacity.
* If capacity is reached, any additional incoming product will be destroyed and counted as a Loss.
* If capacity is set to `0`, the Sink becomes an infinite delivery point: products are instantly cashed in without being stored.

---

## 4. Source (Machine and Factory)

A `Source` generates products. If it has no inputs, it produces products infinitely (like a supplier). If it has inputs, it acts as an assembly machine and waits until all required resources are available before starting a production cycle.

```javascript
// Create a processing machine
var machine = createSource();
machine.setName('Processor');
machine.setProduct(box);
machine.setDuration(4);
machine.setFailFrequence(0.05);
machine.setBreakFrequence(0.02);
machine.setBreakDuration(15);
machine.addAsset('machine', 0, 0, 0, 1);
machine.setX(-2);
machine.setY(0);
```

**Specific Methods:**

* `createSource()` : Instantiates and returns a new source.
* `setProduct(product)` : Defines the product that will be manufactured and dispatched by this machine.
* `setDuration(ticks)` : Defines the time (in ticks) required to manufacture one product once resources are consumed.
* `setFailFrequence(ratio)` : Defines the probability (from 0.0 to 1.0) that a product will be defective at the end of production.
* `setBreakFrequence(ratio)` : Defines the probability (from 0.0 to 1.0) per tick that the machine randomly breaks down.
* `setBreakDuration(ticks)` : Defines the repair time (in ticks) required before the machine can resume production.

---

## 5. Link (Connections and Flow)

`Link` objects define the physical flows between your entities. They show how products travel and define the “recipe” when feeding a machine.

```javascript
// Connect the machine to the buffer
var link = createLink();
link.setFrom(machine);
link.setTo(buffer);
link.setVolume(2);
link.addPosition(0, 2);
```

**Specific Methods:**

* `createLink()` : Instantiates and returns a new link.
* `setFrom(entity)` : Defines the origin entity (typically a Source or Sink).
* `setTo(entity)` : Defines the destination entity (typically a Sink or Source).
* `setVolume(value)` : Defines the transported quantity. If this link points to a Source, this value indicates the exact quantity required by the machine to launch a single production cycle.
* `addPosition(x, z)` : Adds an invisible waypoint to curve the visual conveyor path on the map. Can be called multiple times to create complex routes.

