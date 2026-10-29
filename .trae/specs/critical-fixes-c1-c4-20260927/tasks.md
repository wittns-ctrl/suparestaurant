# SupaMeal Backend — Critical Fixes C1–C4: Implementation Plan

## Task 1: PaymentsService findAll role-scoped + controller pass-through (C1)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: None
- **Description**:
  - Change `payments.service.ts findAll()` signature to accept `(userId?: string, userRole?: string)`.
  - First-line guard inside service: if userRole !== ADMIN, throw `UnauthorizedException('Admin role required to list payments')` before any DB query.
  - Update `payments.controller.ts` `@Get() findAll(@CurrentUser() user)` to call `this.paymentsService.findAll(user.id, user.role)`.
  - Ensure existing `findOne`, `remove`, `findByOrder` remain ADMIN-only (currently correctly guarded at controller; no signature change required unless belt-and-suspenders desired).
- **Acceptance Criteria Addressed**: AC-1, AC-6, AC-7
- **Test Requirements**:
  - `rule` TR-1.1: Grep of payments.service.ts findAll method shows role guard throw on first lines with ADMIN check.
  - `rule` TR-1.2: Controller findAll invokes service with (user.id, user.role) — Read of controller line 61-66 shows CurrentUser injection + pass args.
  - `rule` TR-1.3: `nest build` completes — exit 0 with no TS2345/TS2554 signature mismatches.
- **Notes**: Also add a RolesGuard + @Roles(ADMIN) check duplication as today's controller already does.

## Task 2: PaymentsService constructor — production Stripe fail-fast (C2)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: None
- **Description**:
  - After the existing `const sk = process.env.STRIPE_SECRET_KEY` block and before the warning logger, add a production-mode guard:
    ```
    const env = (process.env.NODE_ENV || 'development').toLowerCase();
    const isProd = env === 'production' || env === 'prod';
    if (isProd && !this.stripe) {
      throw new Error('PAYMENTS_MISCONFIGURED: STRIPE_SECRET_KEY is required when NODE_ENV=production. Refusing to start in insecure fake-payments mode.');
    }
    ```
  - Update the existing warning logger to clarify "This is ONLY allowed in NODE_ENV=development — production will refuse to boot."
- **Acceptance Criteria Addressed**: AC-2, AC-6
- **Test Requirements**:
  - `rule` TR-2.1: File read shows `throw new Error('PAYMENTS_MISCONFIGURED: STRIPE_SECRET_KEY...')` inside constructor, guarded by `NODE_ENV === 'production'` or equivalent inclusive check.
  - `rule` TR-2.2: Non-prod path still logs the existing warning `logger.warn(...)` — no removal, only clarification.
  - `rule` TR-2.3: Nest build typechecks (no syntax/TS errors).
- **Notes**: No runtime boot test in sandbox expected; code presence + typecheck are sufficient evidence per AC-2 pass condition.

## Task 3: RestaurantsService ownership assertions on update/addImages/removeImage + controller pass userId (C3)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: None
- **Description**:
  - In restaurants.service.ts:
    1. Add private helper `assertOwnerOrAdmin(ownerId: Types.ObjectId | string | undefined, userId?: string, userRole?: string): void` — throws UnauthorizedException unless `userRole === ADMIN` OR `ownerId?.toString() === userId`.
    2. Change signatures: `update(id, dto, userId?, userRole?)`, `addImages(id, images, userId?, userRole?)`, `removeImage(id, imageUrl, userId?, userRole?)`.
    3. Inside each: fetch the restaurant first (if not already fetched), call `assertOwnerOrAdmin(existing.ownerId, userId, userRole)`, then proceed.
    4. The `remove(id)` method remains unchanged (controller is ADMIN-only today).
  - In restaurants.controller.ts:
    1. `@Patch(':id') update()` — already has CurrentUser; ensure it passes user.id and user.role to service.update.
    2. `@Post(':id/images') addImages()` — add @CurrentUser() parameter and pass user.id/user.role to service.addImages.
    3. `@Delete(':id/images') removeImage()` — add @CurrentUser() parameter and pass user.id/user.role to service.removeImage.
- **Acceptance Criteria Addressed**: AC-3, AC-6, AC-7
- **Test Requirements**:
  - `rule` TR-3.1: assertOwnerOrAdmin helper exists in service file and uses ADMIN check + ownerId toString equality.
  - `rule` TR-3.2: update, addImages, removeImage signatures all accept userId/userRole and call the helper before writes.
  - `rule` TR-3.3: Controller injects CurrentUser on all three mutated endpoints and forwards to service.
  - `rule` TR-3.4: nest build passes TS.
- **Notes**: Copy the BookingsService ownership comparison style to stay consistent.

## Task 4: Create Promo schema + DTOs + wire module registration
- **Status**: `pending`
- **Priority**: high
- **Depends On**: None
- **Description**:
  - `promos/schema/promo.schema.ts`:
    - `@Schema({ timestamps: true }) export class Promo` with props:
      - `code` — Prop required, unique index, uppercase.
      - `description` — optional string.
      - `discountType` — enum PromoDiscountType = { FLAT = 'flat', PERCENT = 'percent' }, required.
      - `discountValue` — number required.
      - `minOrderValue` — optional number.
      - `maxDiscountValue` — optional number (capped percent value).
      - `startsAt` — optional Date.
      - `expiresAt` — optional Date.
      - `usageLimit` — optional number.
      - `timesUsed` — number default 0.
      - `isActive` — boolean default true.
    - Export `PromoDocument = Promo & Document` and `PromoSchema = SchemaFactory.createForClass(Promo)`.
  - `promos/dto/create-promo.dto.ts`:
    - class-validator decorators matching the mutable fields. `@IsString() @IsUppercase() @Trim() code`; `@IsEnum(PromoDiscountType) discountType`; `@IsNumber() @Min(0) discountValue`; `@IsOptional() @IsNumber() @Min(0) minOrderValue, maxDiscountValue, usageLimit`; `@IsOptional() @IsDateString() startsAt, expiresAt`; `@IsOptional() @IsBoolean() isActive`; `@IsOptional() @IsString() description`.
  - `promos/dto/update-promo.dto.ts`:
    - Partial using `PartialType` from mapped-types (or manual Partial fields), same validators but all optional.
  - `promos/dto/validate-promo.dto.ts`:
    - `@IsString() code: string;` + `@IsNumber() @Min(0) subtotal: number;`.
  - Update `promos/promos.module.ts`:
    - Add `imports: [MongooseModule.forFeature([{ name: Promo.name, schema: PromoSchema }])]`.
    - Add `providers: [PromosService]`.
    - Add `exports: [PromosService]` so OrdersModule can import.
  - Update `orders/orders.module.ts`: `imports: [..., PromosModule]`.
- **Acceptance Criteria Addressed**: AC-4, AC-5, AC-6, AC-7
- **Test Requirements**:
  - `rule` TR-4.1: Schema file exists with required `code` unique index + enum discountType + fields listed.
  - `rule` TR-4.2: DTOs for create/update/validate exist with class-validator decorators.
  - `rule` TR-4.3: PromosModule imports Mongoose.forFeature and exports PromosService. OrdersModule imports PromosModule.
  - `rule` TR-4.4: nest build passes.
- **Notes**: Mirror existing bookings.schema.ts, bookings/dto style closely.

## Task 5: Create PromosService with full CRUD + validate()
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 4 (needs schema/dto to exist, but service can be authored alongside Task 4 — no circular dep; treat as sequential for clarity)
- **Description**:
  - `promos/promos.service.ts`:
    - `@Injectable()` with `@InjectModel(Promo.name) private promoModel: Model<PromoDocument>`.
    - `create(dto: CreatePromoDto)`: normalize code to uppercase trimmed, check uniqueness manually if needed + DB unique index. Save and return formatted view.
    - `findAll({ activeOnly?: boolean, code?: string })`: filter query, sort -createdAt, limit 100, format list.
    - `findOne(id: string)`: by ObjectId; NotFoundException.
    - `findByCode(code: string, { activeOnly = true } = {})`: code uppercase, returns raw doc or null.
    - `update(id, dto: UpdatePromoDto)`: findByIdAndUpdate, NotFound.
    - `remove(id)`: findByIdAndDelete, NotFound.
    - `validateCode(code: string, subtotal: number): { valid: boolean; code: string; discount: number; discountType?: PromoDiscountType; message: string }`:
      1. Load by code via findByCode.
      2. If missing → invalid.
      3. If !isActive OR (expiresAt && < now) OR (startsAt && > now) → invalid with reason message.
      4. If minOrderValue set && subtotal < minOrderValue → invalid.
      5. If usageLimit set && timesUsed >= usageLimit → invalid.
      6. Compute discount: if FLAT → value (capped 0..subtotal); if PERCENT → (subtotal * value / 100), capped by maxDiscountValue if set.
      7. Do NOT increment timesUsed here (defer to order-create success path to avoid counting failed/abandoned validations).
      8. Return valid=true with computed discount + discountType.
    - `incrementUsage(id)`: internal helper (optional), called from orders.service when discount actually applied to a saved order.
- **Acceptance Criteria Addressed**: AC-4, AC-5, AC-6
- **Test Requirements**:
  - `rule` TR-5.1: Service file exported as PromosService with the 6 public methods above + constructor InjectModel.
  - `rule` TR-5.2: validateCode implements each check (missing, inactive, date window, min order, usage limit, numeric compute with cap).
  - `rule` TR-5.3: nest build passes.
- **Notes**: Use NotFoundException, BadRequestException consistently with other services.

## Task 6: Rewrite PromosController for RBAC CRUD + auth-guarded validate
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 4, Task 5
- **Description**:
  - Replace contents of promos.controller.ts:
    - Add controller imports: `JwtAuthGuard, RolesGuard, Roles, CurrentUser, roles, DTO classes`.
    - Routes:
      1. `@Post()` — `@UseGuards(JwtAuthGuard, RolesGuard) @Roles(roles.ADMIN) create(@Body() dto: CreatePromoDto)`.
      2. `@Get()` — `@UseGuards(JwtAuthGuard, RolesGuard) @Roles(roles.ADMIN) findAll(@Query('activeOnly') activeOnly?)`.
      3. `@Get(':id')` — admin-only findOne.
      4. `@Patch(':id')` — admin-only update.
      5. `@Delete(':id')` — admin-only remove.
      6. `@Post('validate')` — `@UseGuards(JwtAuthGuard) validate(@Body() dto: ValidatePromoDto, @CurrentUser() user)` — call `promosService.validateCode(dto.code.trim().toUpperCase(), dto.subtotal)`, return result object as-is.
- **Acceptance Criteria Addressed**: AC-4, AC-5, AC-7
- **Test Requirements**:
  - `rule` TR-6.1: Controller has exactly 6 routes; CRUD 5 are ADMIN guarded; validate uses JwtAuthGuard only (not admin), Throttler global applies.
  - `rule` TR-6.2: validate route DTO is `ValidatePromoDto` with class-validator so missing `subtotal` → 400.
  - `rule` TR-6.3: validate normalizes code to uppercase before passing to service (controller or service — acceptable either, as long as it occurs).
  - `rule` TR-6.4: nest build passes TS.
- **Notes**: Remove the current bare `@Post('validate')` with hardcoded SUPA10 logic entirely.

## Task 7: Orders service — replace inline SUPA10 promo check with PromosService call
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 4, Task 5, Task 6
- **Description**:
  - Inject PromosService into OrdersService constructor.
  - In `create(dto, ...)` method, remove the inline block:
    ```ts
    let discount = 0;
    if (dto.promoCode?.toUpperCase() === 'SUPA10') { discount = 5; }
    ```
  - Replace with:
    1. `let discount = 0; let appliedPromoId: Types.ObjectId | null = null; let appliedDiscountType: PromoDiscountType | null = null;`
    2. `if (dto.promoCode) { const result = await promosService.validateCode(dto.promoCode, subtotal); if (result.valid) { discount = result.discount; appliedDiscountType = result.discountType!; /* resolve promo doc id by findByCode */ } }`
    3. Keep subsequent `const deliveryFee = 3.99` (that's H1, out of scope) — only the discount logic changes.
    4. Optionally: if order saved successfully and discount > 0, increment the promo's `timesUsed` (service incrementUsage). Do not decrement on order cancel for now — out of scope.
- **Acceptance Criteria Addressed**: AC-4, AC-6
- **Test Requirements**:
  - `rule` TR-7.1: Grep of orders.service.ts string literal `SUPA10` returns 0 matches (excluding comments).
  - `rule` TR-7.2: PromosService is injected in constructor; validateCode call present in create.
  - `rule` TR-7.3: PromosModule imported in OrdersModule imports array (Task 4 verifies this; re-check here).
  - `rule` TR-7.4: nest build passes.
- **Notes**: Ensure `promoCode` is normalized (uppercase/trim) exactly once.

## Task 8: End-to-end type-check + backend build finalization
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1, 2, 3, 4, 5, 6, 7
- **Description**:
  - Run `cd SPML_backend/supameal_backend; npm run build`.
  - Fix any dangling imports, missing TS signatures, unused vars, or module wiring issues introduced in Tasks 1–7.
  - Iterate until build exits cleanly (exit 0).
- **Acceptance Criteria Addressed**: AC-6
- **Test Requirements**:
  - `rule` TR-8.1: `nest build` completes with exit 0 and no `TSxxxx error:` lines in stdout/stderr.
  - `rule` TR-8.2: Run `npm run lint` (if available) and do not introduce new lint errors; fixes are allowed where obvious.
- **Notes**: May take a few edit/fix iterations.
