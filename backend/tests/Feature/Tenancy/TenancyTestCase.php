<?php

namespace Tests\Feature\Tenancy;

use Tests\Support\StatefulApiTestCase;

/**
 * Tenancy-module alias of the shared `StatefulApiTestCase` — see
 * `Tests\Feature\Identity\IdentityTestCase`'s own doc comment for why this
 * thin per-module subclass exists instead of every test importing the
 * shared base directly.
 */
abstract class TenancyTestCase extends StatefulApiTestCase {}
