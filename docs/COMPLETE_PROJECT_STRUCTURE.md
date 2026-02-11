# Complete Next.js Project Structure - Enterprise Multi-Tenant SaaS

## 🎯 Role-Based Access Strategy

### User Hierarchy & Access Levels

```
┌─────────────────────────────────────────────────────────────┐
│ SUPER ADMIN                                                 │
│ - Platform owner                                            │
│ - Manages all companies/tenants                             │
│ - Full system access                                        │
│ - Different sidebar: Tenants, Platform Analytics, System   │
└─────────────────────────────────────────────────────────────┘
                            │
            ┌───────────────┴───────────────┐
            │                               │
┌───────────────────────────┐   ┌──────────────────────────┐
│ COMPANY ADMIN             │   │ COMPANY MANAGER          │
│ - Company owner           │   │ - Limited admin rights   │
│ - Full company access     │   │ - Module-specific access │
│ - Team management         │   │ - Cannot manage billing  │
│ - Billing & settings      │   │ - Cannot delete company  │
└───────────────────────────┘   └──────────────────────────┘
            │                               │
            └───────────────┬───────────────┘
                            │
            ┌───────────────┴───────────────────────────┐
            │                                           │
┌───────────────────────┐               ┌──────────────────────────┐
│ EMPLOYEE (Standard)   │               │ EMPLOYEE (Department)    │
│ - Basic access        │               │ - Department-specific    │
│ - Own profile         │               │ - CRM: Sales Team        │
│ - Chat access         │               │ - Fleet: Drivers         │
│ - Assigned modules    │               │ - HR: HR Staff           │
└───────────────────────┘               └──────────────────────────┘
```

---

## 📁 Complete Project Structure

```
ceo/                                        # Project root
│
├── .app/                                   # 📄 App structure documentation
│   ├── APP_STRUCTURE.md                    # Detailed app folder structure
│   └── ROLE_PERMISSIONS.md                 # Role-based access matrix
│
├── app/                                    # ⚡ Next.js 14+ App Router (see APP_STRUCTURE.md)
│   ├── (auth)/                             # Public routes
│   ├── (onboarding)/                       # Onboarding flow
│   ├── (dashboard)/                        # Main app (employees, admins)
│   ├── admin/                              # Super admin panel
│   └── api/                                # API routes
│
├── components/                             # 🧩 React Components (organized by domain)
│   ├── shared/                             # Shared/common components
│   │   ├── ui/                             # Base UI components (shadcn/ui style)
│   │   │   ├── button/
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Button.test.tsx
│   │   │   │   └── index.ts
│   │   │   ├── input/
│   │   │   │   ├── Input.tsx
│   │   │   │   ├── Input.test.tsx
│   │   │   │   └── index.ts
│   │   │   ├── select/
│   │   │   ├── checkbox/
│   │   │   ├── radio/
│   │   │   ├── textarea/
│   │   │   ├── dialog/
│   │   │   ├── modal/
│   │   │   ├── dropdown/
│   │   │   ├── tooltip/
│   │   │   ├── toast/
│   │   │   ├── card/
│   │   │   ├── badge/
│   │   │   ├── avatar/
│   │   │   ├── skeleton/
│   │   │   ├── spinner/
│   │   │   ├── tabs/
│   │   │   ├── accordion/
│   │   │   ├── table/
│   │   │   ├── pagination/
│   │   │   ├── datepicker/
│   │   │   ├── timepicker/
│   │   │   └── index.ts                    # Barrel export
│   │   │
│   │   ├── forms/                          # Form components
│   │   │   ├── FormField.tsx
│   │   │   ├── FormLabel.tsx
│   │   │   ├── FormError.tsx
│   │   │   ├── FormWrapper.tsx
│   │   │   └── index.ts
│   │   │
│   │   ├── data-display/                   # Data display components
│   │   │   ├── DataTable.tsx               # Advanced table with sorting/filtering
│   │   │   ├── DataGrid.tsx                # Grid layout for cards
│   │   │   ├── EmptyState.tsx              # Empty state illustration
│   │   │   ├── ErrorState.tsx              # Error state display
│   │   │   ├── StatCard.tsx                # Metric/stat card
│   │   │   └── index.ts
│   │   │
│   │   ├── feedback/                       # User feedback components
│   │   │   ├── Alert.tsx
│   │   │   ├── Notification.tsx
│   │   │   ├── ConfirmDialog.tsx
│   │   │   └── index.ts
│   │   │
│   │   └── utils/                          # Utility components
│   │       ├── ConditionalRender.tsx
│   │       ├── WithPermission.tsx          # Permission-based rendering
│   │       ├── WithRole.tsx                # Role-based rendering
│   │       └── index.ts
│   │
│   ├── layouts/                            # 🏗️ Layout components
│   │   ├── sidebars/                       # Role-based sidebars
│   │   │   ├── SuperAdminSidebar.tsx       # Super admin navigation
│   │   │   ├── CompanyAdminSidebar.tsx     # Company admin navigation
│   │   │   ├── ManagerSidebar.tsx          # Manager navigation
│   │   │   ├── EmployeeSidebar.tsx         # Employee navigation
│   │   │   ├── SidebarWrapper.tsx          # Common sidebar logic
│   │   │   └── index.ts
│   │   │
│   │   ├── headers/                        # Header components
│   │   │   ├── DashboardHeader.tsx         # Main app header
│   │   │   ├── AdminHeader.tsx             # Admin panel header
│   │   │   ├── UserMenu.tsx                # User dropdown menu
│   │   │   ├── NotificationBell.tsx        # Notification icon + dropdown
│   │   │   ├── CompanySwitcher.tsx         # Switch between companies (super admin)
│   │   │   └── index.ts
│   │   │
│   │   ├── breadcrumbs/
│   │   │   ├── Breadcrumbs.tsx
│   │   │   └── index.ts
│   │   │
│   │   └── footers/
│   │       ├── DashboardFooter.tsx
│   │       └── index.ts
│   │
│   ├── auth/                               # 🔐 Authentication components
│   │   ├── LoginForm.tsx
│   │   ├── SignupForm.tsx
│   │   ├── ResetPasswordForm.tsx
│   │   ├── VerifyEmailCard.tsx
│   │   ├── OAuthButtons.tsx                # Google, GitHub login buttons
│   │   └── index.ts
│   │
│   ├── onboarding/                         # 🚀 Onboarding components
│   │   ├── OnboardingProgress.tsx          # Progress bar for steps
│   │   ├── CompanyInfoForm.tsx             # Step 1
│   │   ├── ContactDetailsForm.tsx          # Step 2
│   │   ├── BrandingForm.tsx                # Step 3
│   │   ├── PreferencesForm.tsx             # Step 4
│   │   ├── OnboardingReview.tsx            # Step 5
│   │   └── index.ts
│   │
│   ├── dashboard/                          # 📊 Dashboard components
│   │   ├── widgets/                        # Dashboard widgets
│   │   │   ├── MetricCard.tsx              # KPI card
│   │   │   ├── ChartWidget.tsx             # Chart container
│   │   │   ├── RecentActivityWidget.tsx
│   │   │   ├── QuickActionsWidget.tsx
│   │   │   ├── UpcomingTasksWidget.tsx
│   │   │   └── index.ts
│   │   │
│   │   ├── charts/                         # Chart components
│   │   │   ├── LineChart.tsx               # Using recharts/tremor
│   │   │   ├── BarChart.tsx
│   │   │   ├── PieChart.tsx
│   │   │   ├── AreaChart.tsx
│   │   │   └── index.ts
│   │   │
│   │   └── index.ts
│   │
│   ├── crm/                                # 🤝 CRM module components
│   │   ├── customers/
│   │   │   ├── CustomerList.tsx
│   │   │   ├── CustomerCard.tsx
│   │   │   ├── CustomerForm.tsx
│   │   │   ├── CustomerDetail.tsx
│   │   │   ├── CustomerFilters.tsx
│   │   │   └── index.ts
│   │   │
│   │   ├── deals/
│   │   │   ├── DealKanban.tsx              # Kanban board
│   │   │   ├── DealCard.tsx                # Deal card in pipeline
│   │   │   ├── DealForm.tsx
│   │   │   ├── DealDetail.tsx
│   │   │   ├── DealStageSelector.tsx
│   │   │   └── index.ts
│   │   │
│   │   ├── activities/
│   │   │   ├── ActivityTimeline.tsx
│   │   │   ├── ActivityForm.tsx
│   │   │   ├── ActivityCard.tsx
│   │   │   └── index.ts
│   │   │
│   │   └── index.ts
│   │
│   ├── fleet/                              # 🚛 Fleet module components
│   │   ├── vehicles/
│   │   │   ├── VehicleList.tsx
│   │   │   ├── VehicleCard.tsx
│   │   │   ├── VehicleForm.tsx
│   │   │   ├── VehicleDetail.tsx
│   │   │   ├── VehicleTelemetry.tsx        # Live tracking
│   │   │   └── index.ts
│   │   │
│   │   ├── drivers/
│   │   │   ├── DriverList.tsx
│   │   │   ├── DriverCard.tsx
│   │   │   ├── DriverForm.tsx
│   │   │   ├── DriverPerformance.tsx
│   │   │   └── index.ts
│   │   │
│   │   ├── shipments/
│   │   │   ├── ShipmentList.tsx
│   │   │   ├── ShipmentCard.tsx
│   │   │   ├── ShipmentForm.tsx
│   │   │   ├── ShipmentTracking.tsx        # Map with route
│   │   │   └── index.ts
│   │   │
│   │   ├── maps/
│   │   │   ├── FleetMap.tsx                # Map with all vehicles
│   │   │   ├── RouteMap.tsx                # Single route
│   │   │   └── index.ts
│   │   │
│   │   └── index.ts
│   │
│   ├── inventory/                          # 📦 Inventory module components
│   │   ├── products/
│   │   │   ├── ProductList.tsx
│   │   │   ├── ProductCard.tsx
│   │   │   ├── ProductForm.tsx
│   │   │   ├── ProductDetail.tsx
│   │   │   ├── StockLevelIndicator.tsx
│   │   │   └── index.ts
│   │   │
│   │   ├── warehouses/
│   │   │   ├── WarehouseList.tsx
│   │   │   ├── WarehouseCard.tsx
│   │   │   ├── WarehouseForm.tsx
│   │   │   ├── WarehouseInventory.tsx
│   │   │   └── index.ts
│   │   │
│   │   ├── purchase-orders/
│   │   │   ├── POList.tsx
│   │   │   ├── POCard.tsx
│   │   │   ├── POForm.tsx
│   │   │   ├── PODetail.tsx
│   │   │   ├── POReceiveForm.tsx
│   │   │   └── index.ts
│   │   │
│   │   └── index.ts
│   │
│   ├── hr/                                 # 👥 HR module components
│   │   ├── employees/
│   │   │   ├── EmployeeList.tsx
│   │   │   ├── EmployeeCard.tsx
│   │   │   ├── EmployeeForm.tsx
│   │   │   ├── EmployeeProfile.tsx
│   │   │   ├── EmployeeDocuments.tsx
│   │   │   └── index.ts
│   │   │
│   │   ├── attendance/
│   │   │   ├── AttendanceCalendar.tsx
│   │   │   ├── ClockInOut.tsx
│   │   │   ├── AttendanceReport.tsx
│   │   │   └── index.ts
│   │   │
│   │   ├── leave/
│   │   │   ├── LeaveRequestList.tsx
│   │   │   ├── LeaveRequestForm.tsx
│   │   │   ├── LeaveCalendar.tsx
│   │   │   ├── LeaveApprovalCard.tsx
│   │   │   └── index.ts
│   │   │
│   │   ├── payroll/
│   │   │   ├── PayrollDashboard.tsx
│   │   │   ├── PayslipGenerator.tsx
│   │   │   ├── PayrollRunForm.tsx
│   │   │   └── index.ts
│   │   │
│   │   └── index.ts
│   │
│   ├── chat/                               # 💬 Chat module components (shared across all employees)
│   │   ├── ChatSidebar.tsx                 # Channel/DM list
│   │   ├── ChatWindow.tsx                  # Main chat area
│   │   ├── MessageList.tsx                 # Message thread
│   │   ├── MessageInput.tsx                # Message composer
│   │   ├── MessageBubble.tsx               # Single message
│   │   ├── ChannelHeader.tsx               # Channel info bar
│   │   ├── ChannelSettings.tsx             # Channel settings modal
│   │   ├── UserPresence.tsx                # Online/offline indicator
│   │   ├── TypingIndicator.tsx             # "User is typing..."
│   │   ├── FileUpload.tsx                  # File attachment
│   │   └── index.ts
│   │
│   ├── ai-agent/                           # 🤖 AI Agent components
│   │   ├── ConversationList.tsx            # Past conversations
│   │   ├── ChatInterface.tsx               # AI chat UI
│   │   ├── MessageStream.tsx               # Streaming responses
│   │   ├── SuggestionChips.tsx             # Quick prompts
│   │   └── index.ts
│   │
│   ├── settings/                           # ⚙️ Settings components
│   │   ├── profile/
│   │   │   ├── ProfileForm.tsx
│   │   │   ├── AvatarUpload.tsx
│   │   │   └── index.ts
│   │   │
│   │   ├── company/
│   │   │   ├── CompanyInfoForm.tsx
│   │   │   ├── BrandingSettings.tsx
│   │   │   ├── LogoUpload.tsx
│   │   │   └── index.ts
│   │   │
│   │   ├── users/
│   │   │   ├── UserList.tsx
│   │   │   ├── UserInviteForm.tsx
│   │   │   ├── UserPermissions.tsx
│   │   │   └── index.ts
│   │   │
│   │   ├── roles/
│   │   │   ├── RoleList.tsx
│   │   │   ├── RoleForm.tsx
│   │   │   ├── PermissionMatrix.tsx        # Permission checkboxes
│   │   │   └── index.ts
│   │   │
│   │   └── index.ts
│   │
│   ├── admin/                              # 🔐 Super Admin components
│   │   ├── tenants/
│   │   │   ├── TenantList.tsx
│   │   │   ├── TenantCard.tsx
│   │   │   ├── TenantForm.tsx
│   │   │   ├── TenantDetail.tsx
│   │   │   ├── TenantUsageChart.tsx
│   │   │   └── index.ts
│   │   │
│   │   ├── analytics/
│   │   │   ├── PlatformMetrics.tsx
│   │   │   ├── RevenueChart.tsx
│   │   │   ├── UserGrowthChart.tsx
│   │   │   └── index.ts
│   │   │
│   │   └── index.ts
│   │
│   └── providers/                          # 🌐 Context providers (component wrappers)
│       ├── ThemeProvider.tsx
│       ├── AuthProvider.tsx
│       ├── CompanyProvider.tsx
│       ├── PermissionProvider.tsx
│       └── index.ts
│
├── composables/                            # 🪝 Custom React Hooks (Vue-style naming)
│   ├── auth/
│   │   ├── useAuth.ts                      # Auth state & methods
│   │   ├── useSession.ts                   # Session management
│   │   ├── useUser.ts                      # Current user data
│   │   ├── usePermissions.ts               # Permission checking
│   │   └── index.ts
│   │
│   ├── company/
│   │   ├── useCompany.ts                   # Current company context
│   │   ├── useCompanySwitcher.ts           # Switch between companies (super admin)
│   │   └── index.ts
│   │
│   ├── api/                                # API hooks (React Query)
│   │   ├── crm/
│   │   │   ├── useCustomers.ts             # CRUD hooks for customers
│   │   │   ├── useDeals.ts
│   │   │   ├── useActivities.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── fleet/
│   │   │   ├── useVehicles.ts
│   │   │   ├── useDrivers.ts
│   │   │   ├── useShipments.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── inventory/
│   │   │   ├── useProducts.ts
│   │   │   ├── useWarehouses.ts
│   │   │   ├── usePurchaseOrders.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── hr/
│   │   │   ├── useEmployees.ts
│   │   │   ├── useLeave.ts
│   │   │   ├── useAttendance.ts
│   │   │   └── index.ts
│   │   │
│   │   └── index.ts
│   │
│   ├── ui/
│   │   ├── useTheme.ts                     # Dark/light mode
│   │   ├── useMediaQuery.ts                # Responsive breakpoints
│   │   ├── useToast.ts                     # Toast notifications
│   │   ├── useModal.ts                     # Modal state management
│   │   ├── useLocalStorage.ts              # LocalStorage wrapper
│   │   ├── useDebounce.ts                  # Debounce hook
│   │   └── index.ts
│   │
│   ├── realtime/
│   │   ├── useRealtimeSubscription.ts      # Supabase realtime
│   │   ├── usePresence.ts                  # User online/offline
│   │   ├── useChatMessages.ts              # Chat realtime updates
│   │   └── index.ts
│   │
│   └── index.ts
│
├── lib/                                    # 🛠️ Utility libraries & core logic
│   ├── supabase/
│   │   ├── client.ts                       # Supabase client (browser)
│   │   ├── server.ts                       # Supabase server client
│   │   ├── admin.ts                        # Supabase admin client
│   │   ├── middleware.ts                   # Middleware helpers
│   │   └── index.ts
│   │
│   ├── api/                                # API client functions
│   │   ├── client.ts                       # Base API client (axios/fetch)
│   │   ├── crm.ts                          # CRM API methods
│   │   ├── fleet.ts                        # Fleet API methods
│   │   ├── inventory.ts                    # Inventory API methods
│   │   ├── hr.ts                           # HR API methods
│   │   └── index.ts
│   │
│   ├── auth/
│   │   ├── session.ts                      # Session helpers
│   │   ├── permissions.ts                  # Permission checking logic
│   │   ├── roles.ts                        # Role definitions & checks
│   │   └── index.ts
│   │
│   ├── validation/
│   │   ├── schemas.ts                      # Zod validation schemas
│   │   ├── customer.schema.ts
│   │   ├── deal.schema.ts
│   │   ├── vehicle.schema.ts
│   │   └── index.ts
│   │
│   ├── utils/
│   │   ├── date.ts                         # Date formatting utilities
│   │   ├── currency.ts                     # Currency formatting
│   │   ├── string.ts                       # String utilities
│   │   ├── array.ts                        # Array utilities
│   │   ├── file.ts                         # File upload/download
│   │   └── index.ts
│   │
│   └── constants/
│       ├── roles.ts                        # Role constants
│       ├── permissions.ts                  # Permission constants
│       ├── routes.ts                       # Route constants
│       ├── modules.ts                      # Module definitions
│       └── index.ts
│
├── types/                                  # 📘 TypeScript type definitions
│   ├── database.types.ts                   # Supabase generated types
│   ├── auth.types.ts                       # Auth-related types
│   ├── user.types.ts                       # User, Role, Permission types
│   ├── company.types.ts                    # Company, Tenant types
│   ├── crm.types.ts                        # CRM entities
│   ├── fleet.types.ts                      # Fleet entities
│   ├── inventory.types.ts                  # Inventory entities
│   ├── hr.types.ts                         # HR entities
│   ├── chat.types.ts                       # Chat entities
│   ├── api.types.ts                        # API request/response types
│   └── index.ts
│
├── config/                                 # ⚙️ Configuration files
│   ├── site.config.ts                      # Site metadata, SEO
│   ├── navigation.config.ts                # Navigation configurations by role
│   ├── permissions.config.ts               # Permission matrix
│   ├── modules.config.ts                   # Module configurations
│   ├── api.config.ts                       # API endpoints
│   └── index.ts
│
├── locales/                                # 🌍 Internationalization (i18n)
│   ├── en/
│   │   ├── common.json                     # Common translations
│   │   ├── auth.json                       # Auth pages
│   │   ├── dashboard.json                  # Dashboard
│   │   ├── crm.json                        # CRM module
│   │   ├── fleet.json                      # Fleet module
│   │   ├── inventory.json                  # Inventory module
│   │   ├── hr.json                         # HR module
│   │   ├── chat.json                       # Chat module
│   │   ├── settings.json                   # Settings
│   │   ├── errors.json                     # Error messages
│   │   └── validation.json                 # Validation messages
│   │
│   ├── ar/                                 # Arabic (same structure)
│   │   └── ...
│   │
│   └── fr/                                 # French (same structure)
│       └── ...
│
├── assets/                                 # 🎨 Static assets
│   ├── images/
│   │   ├── logos/
│   │   │   ├── logo.svg                    # Main logo
│   │   │   ├── logo-light.svg              # Light theme logo
│   │   │   ├── logo-dark.svg               # Dark theme logo
│   │   │   ├── logo-icon.svg               # Icon only
│   │   │   └── favicon.ico
│   │   │
│   │   ├── illustrations/                  # Empty states, errors
│   │   │   ├── empty-state.svg
│   │   │   ├── error-404.svg
│   │   │   ├── error-500.svg
│   │   │   ├── no-data.svg
│   │   │   └── success.svg
│   │   │
│   │   ├── avatars/                        # Default avatars
│   │   │   ├── default-male.png
│   │   │   ├── default-female.png
│   │   │   └── default-company.png
│   │   │
│   │   └── placeholders/
│   │       ├── product-placeholder.png
│   │       └── vehicle-placeholder.png
│   │
│   ├── icons/                              # Custom SVG icons
│   │   ├── crm/
│   │   ├── fleet/
│   │   ├── inventory/
│   │   ├── hr/
│   │   └── index.ts                        # Icon exports
│   │
│   ├── fonts/                              # Custom fonts (if not using Google Fonts)
│   │   └── ...
│   │
│   └── videos/                             # Tutorial videos, demos
│       └── onboarding-intro.mp4
│
├── styles/                                 # 🎨 Global styles & theme
│   ├── globals.css                         # Global CSS (Tailwind imports)
│   ├── variables.css                       # CSS custom properties
│   ├── themes/
│   │   ├── light.css                       # Light theme overrides
│   │   └── dark.css                        # Dark theme overrides
│   │
│   └── animations/
│       └── custom-animations.css           # Custom animations
│
├── __tests__/                              # 🧪 Test files (mirrors app structure)
│   ├── unit/
│   │   ├── components/
│   │   │   ├── shared/
│   │   │   │   ├── ui/
│   │   │   │   │   ├── Button.test.tsx
│   │   │   │   │   ├── Input.test.tsx
│   │   │   │   │   └── ...
│   │   │   │   └── ...
│   │   │   │
│   │   │   ├── crm/
│   │   │   │   ├── CustomerList.test.tsx
│   │   │   │   ├── DealKanban.test.tsx
│   │   │   │   └── ...
│   │   │   │
│   │   │   └── ...
│   │   │
│   │   ├── composables/
│   │   │   ├── useAuth.test.ts
│   │   │   ├── usePermissions.test.ts
│   │   │   └── ...
│   │   │
│   │   └── lib/
│   │       ├── utils.test.ts
│   │       ├── validation.test.ts
│   │       └── ...
│   │
│   ├── integration/
│   │   ├── auth-flow.test.tsx              # Login → Dashboard flow
│   │   ├── onboarding-flow.test.tsx        # Complete onboarding
│   │   ├── customer-crud.test.tsx          # Create, read, update, delete
│   │   └── ...
│   │
│   ├── e2e/                                # End-to-end tests (Playwright/Cypress)
│   │   ├── auth.spec.ts
│   │   ├── onboarding.spec.ts
│   │   ├── crm.spec.ts
│   │   └── ...
│   │
│   ├── fixtures/                           # Test data
│   │   ├── users.ts
│   │   ├── companies.ts
│   │   ├── customers.ts
│   │   └── ...
│   │
│   └── mocks/
│       ├── supabase.ts                     # Mocked Supabase client
│       ├── api.ts                          # Mocked API responses
│       └── ...
│
├── public/                                 # 📂 Public static files (served as-is)
│   ├── favicon.ico
│   ├── robots.txt
│   ├── sitemap.xml
│   └── manifest.json                       # PWA manifest
│
├── scripts/                                # 🔧 Build & utility scripts
│   ├── generate-types.ts                   # Generate Supabase types
│   ├── seed-database.ts                    # Database seeding
│   ├── migrate.ts                          # Database migrations
│   └── build-icons.ts                      # Process SVG icons
│
├── docs/                                   # 📚 Project documentation
│   ├── API.md                              # API documentation
│   ├── COMPONENTS.md                       # Component library docs
│   ├── DEPLOYMENT.md                       # Deployment guide
│   ├── DEVELOPMENT.md                      # Development setup
│   ├── ARCHITECTURE.md                     # System architecture
│   └── CONTRIBUTING.md                     # Contribution guidelines
│
├── .github/                                # GitHub-specific files
│   ├── workflows/
│   │   ├── ci.yml                          # CI pipeline
│   │   ├── deploy.yml                      # Deployment pipeline
│   │   └── test.yml                        # Automated testing
│   │
│   └── ISSUE_TEMPLATE/
│       ├── bug_report.md
│       └── feature_request.md
│
├── .vscode/                                # VS Code workspace settings
│   ├── settings.json
│   ├── extensions.json                     # Recommended extensions
│   └── launch.json                         # Debug configurations
│
├── .env.local                              # Environment variables (gitignored)
├── .env.example                            # Example env file
├── .gitignore
├── .eslintrc.json                          # ESLint config
├── .prettierrc                             # Prettier config
├── tsconfig.json                           # TypeScript config
├── next.config.js                          # Next.js config
├── tailwind.config.ts                      # Tailwind CSS config
├── postcss.config.js                       # PostCSS config
├── jest.config.js                          # Jest config
├── playwright.config.ts                    # Playwright config (E2E)
├── package.json
├── pnpm-lock.yaml                          # or package-lock.json / yarn.lock
└── README.md                               # Project overview
```

---

## 🎭 Role-Based Sidebar Configuration

### Strategy: Dynamic Sidebar Based on User Role

Create a configuration file that defines what each role sees:

**File:** `config/navigation.config.ts`

```typescript
import { UserRole } from "@/types";

export const navigationConfig = {
  [UserRole.SUPER_ADMIN]: [
    {
      title: "Platform Overview",
      icon: "LayoutDashboard",
      href: "/admin",
    },
    {
      title: "Tenants",
      icon: "Building2",
      href: "/admin/tenants",
    },
    {
      title: "Analytics",
      icon: "BarChart3",
      href: "/admin/analytics",
    },
    {
      title: "Platform Settings",
      icon: "Settings",
      href: "/admin/settings",
    },
  ],

  [UserRole.COMPANY_ADMIN]: [
    {
      title: "Dashboard",
      icon: "LayoutDashboard",
      href: "/dashboard",
    },
    {
      title: "CRM",
      icon: "Users",
      href: "/crm",
      subItems: [
        { title: "Customers", href: "/crm/customers" },
        { title: "Deals", href: "/crm/deals" },
        { title: "Activities", href: "/crm/activities" },
        { title: "Reports", href: "/crm/reports" },
      ],
    },
    {
      title: "Fleet",
      icon: "Truck",
      href: "/fleet",
      subItems: [
        { title: "Vehicles", href: "/fleet/vehicles" },
        { title: "Drivers", href: "/fleet/drivers" },
        { title: "Shipments", href: "/fleet/shipments" },
        { title: "Maintenance", href: "/fleet/maintenance" },
      ],
    },
    {
      title: "Inventory",
      icon: "Package",
      href: "/inventory",
      subItems: [
        { title: "Products", href: "/inventory/products" },
        { title: "Warehouses", href: "/inventory/warehouses" },
        { title: "Purchase Orders", href: "/inventory/purchase-orders" },
        { title: "Vendors", href: "/inventory/vendors" },
      ],
    },
    {
      title: "HR",
      icon: "UserCog",
      href: "/hr",
      subItems: [
        { title: "Employees", href: "/hr/employees" },
        { title: "Attendance", href: "/hr/attendance" },
        { title: "Leave", href: "/hr/leave" },
        { title: "Payroll", href: "/hr/payroll" },
        { title: "Performance", href: "/hr/performance" },
      ],
    },
    {
      title: "Chat",
      icon: "MessageSquare",
      href: "/chat",
      badge: "3", // Unread count
    },
    {
      title: "AI Agent",
      icon: "Sparkles",
      href: "/ai-agent",
    },
    {
      title: "Settings",
      icon: "Settings",
      href: "/settings",
      subItems: [
        { title: "Profile", href: "/settings/profile" },
        { title: "Company", href: "/settings/company" },
        { title: "Team", href: "/settings/users" },
        { title: "Billing", href: "/settings/billing" },
      ],
    },
  ],

  [UserRole.MANAGER]: [
    {
      title: "Dashboard",
      icon: "LayoutDashboard",
      href: "/dashboard",
    },
    // Only modules assigned to manager
    {
      title: "CRM",
      icon: "Users",
      href: "/crm",
      subItems: [
        { title: "Customers", href: "/crm/customers" },
        { title: "Deals", href: "/crm/deals" },
        { title: "Activities", href: "/crm/activities" },
      ],
    },
    {
      title: "Chat",
      icon: "MessageSquare",
      href: "/chat",
    },
    {
      title: "Settings",
      icon: "Settings",
      href: "/settings/profile",
      // No company settings for manager
    },
  ],

  [UserRole.EMPLOYEE_CRM]: [
    {
      title: "Dashboard",
      icon: "LayoutDashboard",
      href: "/dashboard",
    },
    {
      title: "CRM",
      icon: "Users",
      href: "/crm",
      subItems: [
        { title: "Customers", href: "/crm/customers" },
        { title: "My Deals", href: "/crm/deals" }, // Filtered to own deals
      ],
    },
    {
      title: "Chat",
      icon: "MessageSquare",
      href: "/chat",
    },
    {
      title: "My Profile",
      icon: "User",
      href: "/settings/profile",
    },
  ],

  [UserRole.EMPLOYEE_FLEET]: [
    {
      title: "Dashboard",
      icon: "LayoutDashboard",
      href: "/dashboard",
    },
    {
      title: "Fleet",
      icon: "Truck",
      href: "/fleet",
      subItems: [
        { title: "My Vehicles", href: "/fleet/vehicles" }, // Assigned vehicles only
        { title: "My Shipments", href: "/fleet/shipments" },
      ],
    },
    {
      title: "Chat",
      icon: "MessageSquare",
      href: "/chat",
    },
    {
      title: "My Profile",
      icon: "User",
      href: "/settings/profile",
    },
  ],
};
```

---

## 🚦 Sidebar Rendering Logic

**Component:** `components/layouts/sidebars/SidebarWrapper.tsx`

```typescript
'use client';

import { useAuth } from '@/composables/auth/useAuth';
import { usePermissions } from '@/composables/auth/usePermissions';
import { navigationConfig } from '@/config/navigation.config';
import SuperAdminSidebar from './SuperAdminSidebar';
import CompanyAdminSidebar from './CompanyAdminSidebar';
import ManagerSidebar from './ManagerSidebar';
import EmployeeSidebar from './EmployeeSidebar';
import { UserRole } from '@/types';

export default function SidebarWrapper() {
  const { user } = useAuth();
  const { hasRole } = usePermissions();

  // Get navigation items for current user role
  const navItems = navigationConfig[user.role];

  // Render role-specific sidebar
  if (hasRole(UserRole.SUPER_ADMIN)) {
    return <SuperAdminSidebar items={navItems} />;
  }

  if (hasRole(UserRole.COMPANY_ADMIN)) {
    return <CompanyAdminSidebar items={navItems} />;
  }

  if (hasRole(UserRole.MANAGER)) {
    return <ManagerSidebar items={navItems} />;
  }

  // Default employee sidebar
  return <EmployeeSidebar items={navItems} />;
}
```

---

## 🧩 Component Organization Principles

### 1. **Shared Components** (`components/shared/`)

- Reusable across all modules
- No business logic
- Pure UI components
- Fully tested

### 2. **Module Components** (`components/crm/`, `components/fleet/`, etc.)

- Module-specific
- Contains business logic
- Can use shared components
- Organized by feature

### 3. **Layout Components** (`components/layouts/`)

- Page structure components
- Role-based variations
- Navigation, headers, footers

### 4. **Provider Components** (`components/providers/`)

- Context providers
- Global state management
- Theme, auth, company context

---

## 🧪 Test Organization

### Test File Naming Convention

```
ComponentName.tsx       → ComponentName.test.tsx
useHookName.ts          → useHookName.test.ts
utilityFunction.ts      → utilityFunction.test.ts
```

### Test Structure Mirrors Source

```
components/crm/customers/CustomerList.tsx
↓
__tests__/unit/components/crm/customers/CustomerList.test.tsx
```

### Test Types

1. **Unit Tests**: Individual components, hooks, utilities
2. **Integration Tests**: Multi-component interactions
3. **E2E Tests**: User workflows (login → create customer → etc.)

---

## 📦 Barrel Exports (index.ts)

Every directory has an `index.ts` for clean imports:

```typescript
// components/shared/ui/index.ts
export { Button } from "./button/Button";
export { Input } from "./input/Input";
export { Select } from "./select/Select";
// ... all UI components

// Usage in other files:
import { Button, Input, Select } from "@/components/shared/ui";
```

---

## 🌍 Internationalization (i18n)

### Structure

- One folder per language (`en/`, `ar/`, `fr/`)
- JSON files organized by module
- Namespaced keys

### Usage Example

```typescript
import { useTranslation } from "next-i18next";

const { t } = useTranslation("crm"); // Load crm.json
const title = t("customers.title"); // "Customers"
```

---

## 🔑 Key Benefits of This Structure

### ✅ **Scalability**

- Clear separation of concerns
- Easy to add new modules
- Consistent patterns

### ✅ **Maintainability**

- Predictable file locations
- Modular architecture
- Comprehensive testing

### ✅ **Role-Based Access**

- Different sidebars per role
- Permission-based rendering
- Secure by design

### ✅ **Developer Experience**

- Barrel exports for clean imports
- TypeScript throughout
- Well-documented

### ✅ **Performance**

- Tree-shaking friendly
- Code splitting by module
- Lazy loading where appropriate

---

## 🚀 Next Steps

1. **Create folder structure** (run script to generate all folders)
2. **Set up configs** (navigation, permissions, modules)
3. **Build shared UI components** (button, input, etc.)
4. **Implement auth system** (login, session, permissions)
5. **Create role-based sidebars** (different nav for each role)
6. **Build first module** (start with CRM or simplest module)
7. **Add tests** (unit tests for components)
8. **Iterate** (add more modules, features)

---

**Last Updated:** 2026-02-11  
**Version:** 2.0 - Complete Project Structure with Role-Based Access
