# How periodic component updates flow

This describes the periodic update path for owned entities that already exist and
are initialized on the receiving client. It follows the networked system and
component, `NetworkConnection`, and `NetworkEntities` in `src/`.

![The sending client reads schema-selected component data, selects updated fields by schema index, batches owned entity updates and sends them through its adapter. The receiving adapter delivers the batch, NetworkEntities resolves each networkId, and the remote component uses matching schema indices to apply or interpolate the data.](diagrams/periodic-component-sync.png)

[Edit diagram](https://svgdiagram.ai/diagram-sources/networked-aframe-periodic-component-sync?version=1).

[Download SVG](diagrams/periodic-component-sync.svg).

Read the sending column downward, cross the adapter transport, then read the
receiving column upward. The transport and wire encoding are adapter-specific;
the diagram does not assume peer-to-peer WebRTC or a particular server.

## Sending: select, batch, and delegate

The networked system's `tick()` returns if there is no adapter or the next sync
check is not due. `NAF.options.updateRate` controls the interval between these
checks, not a guarantee that a packet is sent on every check.

On a due check, the system visits its registered components and skips entities
that this client does not own. `syncDirty()` checks whether the component can
sync, then `gatherComponentsData(false)` reads the schema-selected components or
properties. Fields whose `requiresNetworkUpdate` predicates pass are keyed by
schema index, rather than by component name. With the default predicate, fields
are included when their values change.

For example, with the schema `[{ component: 'material', property: 'color' },
'visible']`, component data `{ 0: 'red', 1: true }` means the material color and
visibility values, respectively. Both clients must use the same schema ordering.

Each entity update includes its `networkId`, ownership information and selected
component data. The system collects these updates in `{ d: [...] }` and calls
`broadcastData('um', data)` only when the batch is nonempty. `NetworkConnection`
delegates that call to the adapter. This is the ordinary update API, not the
separate `broadcastDataGuaranteed()` API.

## Receiving: route, check, and apply

The adapter's message listener delivers decoded data to
`NetworkConnection.receivedData()`. Its default `'um'` subscription calls
`NetworkEntities.updateEntityMulti()`, which iterates `data.d` and dispatches each
update by `networkId`. A configured `NAF.options.syncSource` can reject data from
other sources before routing. For an existing entity, this calls the remote networked
component's `networkUpdate()`.

After ownership-time checks reject stale updates, `updateNetworkedComponents()`
uses the receiver's schema indices to find the component or property to update.
Missing or null fields are skipped. Ordinary component data is applied with
`setAttribute()`; position, rotation and scale can be buffered for interpolation
when `NAF.options.useLerp` is enabled.

Initial full synchronization uses the separate `'u'` path and guaranteed-send
APIs. Creating a missing remote entity, connection handshakes, ownership transfer
and disconnection cleanup are outside this periodic-update diagram.
