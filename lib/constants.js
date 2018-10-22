'use strict';
/**
 * Coordinate with
 * the documentation and sales team before changing these values.
 */
module.exports = {
    MAX_QUERY_CHARS: 256,
    MAX_QUERY_TOKENS: 20,
    PROXIMITY_RADIUS: 200,
    MAX_TEXT_SYNONYMS: 10,
    MIN_CORRECTION_LENGTH: 4,
    // Though spatialmatches are sliced to SPATIALMATCH_STACK_LIMIT elements
    // after stackable, the stackable limit should be higehr to leave some
    // headroom as this step does not include type filtering.
    STACKABLE_LIMIT: 100,
    SPATIALMATCH_STACK_LIMIT: 40,
    MAX_CORRECTION_LENGTH: 8,
    VERIFYMATCH_STACK_LIMIT: 20
};
