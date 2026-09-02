<?php

namespace Tests\Feature\Identity;

use Tests\Support\StatefulApiTestCase;

/**
 * Identity-module alias of the shared `StatefulApiTestCase` (AUTH-001).
 * Kept as a distinct class (not a direct extend-in-place) so existing
 * Identity tests need no import changes; see `StatefulApiTestCase` for the
 * actual setup this inherits.
 */
abstract class IdentityTestCase extends StatefulApiTestCase {}
