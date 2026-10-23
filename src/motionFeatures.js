// Motion's layout-animation features, loaded on demand by LazyMotion (see
// PantryColumns). Kept in its own chunk so mobile never downloads it; if it
// fails to load (offline) the cards simply render without animating.
export { domMax as default } from 'motion/react'
