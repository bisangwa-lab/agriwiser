import { createStartHandler,defaultStreamHandler } from '@tanstack/react-start/server';
// AgriWiser's standalone Worker entry. No external error telemetry.
export default {fetch:createStartHandler(defaultStreamHandler)};
