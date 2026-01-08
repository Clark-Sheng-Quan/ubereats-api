Upload Menu
PUT
https://api.uber.com/v2/eats/stores/{store_id}/menus
Access to These APIs May Require Written Approval From Uber

Uber’s APIs are always under development and as such are subject to changes according to our Versioning & Upgrade policy. As part of Uber’s ongoing privacy improvements, we’ve updated our Developer API program with new scope access policies for third party applications. For further information, please refer to our Getting Started guide in the navigation panel.

This Upload Menu endpoint allows a developer to create or override the entire menu for a specific store.

Authorization
OAuth 2.0 Bearer token with the eats.store scope. For more information, see Authentication.

Encoding
The request payload for this endpoint may be very large. We highly recommend the use of a standard HTTP compression algorithm to optimise bandwidth usage and processing time. To opt-in, please add both the following headers:

Header	Description
Content-Encoding	Contains the compression algorithm used to compress the request payload. Compression algorithms currently supported: gzip.
Content-Type	Contains the content type of the decompressed request payload, and must be set to application/json.
Path Parameters
Name	Type	Description
store_id	string	Unique identifying string for a restaurant on Uber Eats, provided by Uber.
Field Behavior / Validation Rules
Alcoholic Product Classification
Once a product is marked as alcoholic (by setting alcoholic_items to a value greater than 0 in the classifications object), it will remain alcoholic even if you attempt to explicitly set it as non-alcoholic in future API updates. This behavior is intentional to ensure compliance and consistency across Uber systems.

If a product was incorrectly marked as alcoholic and must be reverted, please contact Uber Eats Support to request a manual correction.

For more details, see the alcoholic_items field in the Classifications section.

Request Body Parameters
All parameters are required unless stated otherwise.

Request Body Parameters - MenuConfiguration
Root-level menu configuration for a restaurant.

Name	Type	Description
menus	Menu[]	List of the store’s menus.
categories	Category[]	List of the store’s menu categories.
items	Item[]	List of the store’s items.
modifier_groups	ModifierGroup[]	List of the store’s modifier groups.
menu_type	string (enum)	(optional) Menu type to update. Use only if menu needs to be different across different menu types (ie. delivery menu & pickup menu are different). Currently we only support item price and item availability differentiation.

NOTE: Delivery menu must be upserted first. Menus are forever split and must be managed separately after the first call with a menu_type that is not MENU_TYPE_FULFILLMENT_DELIVERY.

ALLOWED VALUES:
MENU_TYPE_FULFILLMENT_DELIVERY
MENU_TYPE_FULFILLMENT_PICK_UP
MENU_TYPE_FULFILLMENT_DINE_IN
Defaults to MENU_TYPE_FULFILLMENT_DELIVERY if not provided. NOTE: MENU_TYPE_FULFILLMENT_DINE_IN is enabled in Australia and NZ only.
Request Body Parameters - Menu
A collection of items available for sale from a restaurant at specified times.

Name	Type	Description
id	string	A unique identifying string for the menu, provided by the restaurant.
title	MultiLanguageText	The name of the menu to be displayed.
subtitle	MultiLanguageText	An optional subtitle for the menu.
service_availability	ServiceAvailability[]	The days and times of the day at which this menu should be made available.
category_ids	string[]	All of the IDs for the menu categories that will be made available while this menu is active.
Request Body Parameters - MultiLanguageText
Provides content for a string displayed to users in multiple languages.

Name	Type	Description
translations	Object (key string: value string)	A mapping from a locale code to the translated text in that locale. Only one translation should be provided and will be displayed to all users. The locale code should specify both language and country code, e.g. en_us.
Request Body Parameters - Service Availability
Specifies menu availability on a specified day of the week.

All parameters are required for the day of the week your menu is available. If your menu is not available on a certain day, you do not need to create an array object for that day.

Name	Type	Description
day_of_week	string (enum)	The day of the week on which these hours will be applied.

ALLOWED VALUES:
“monday”
“tuesday”
“wednesday”
“thursday”
“friday”
“saturday”
“sunday”
time_periods	TimePeriod[]	The continuous time spans during which the menu is available.
Request Body Parameters - TimePeriod
Continuous time span on an individual day (finishes at 23:59).

Name	Type	Description
start_time	string	The time at which the menu becomes available, in 24-hour HH:MM format, e.g. “08:30”, “23:00”
end_time	string	The time at which the menu ceases to be available, in 24-hour HH:MM format, e.g. “08:30”, “23:00”
Request Body Parameters - Category
A grouping that allows related items to be displayed in proximity to each other on a menu.

Name	Type	Description
id	string	A unique identifying string for the category, provided by the restaurant.
title	MultiLanguageText	The displayed name for the category.
subtitle	MultiLanguageText	(optional) A subtitle for the category.
entities	MenuEntity[]	The top-level menu items available for sale within the category - all entities must be of type “ITEM”.
Request Body Parameters - MenuEntity
Allows for specifying entities of different types from the menu, e.g. items and modifier groups.

Name	Type	Description
id	string	The unique identifying string (id) for the item or modifier group being specified
type	string (enum)	The type of the entity being specified.

ALLOWED VALUES:
“ITEM”
“MODIFIER_GROUP”
Request Body Parameters - Item
An individual object that can be ordered - either by itself or, when used within a modifier group, as a component of another item.

Name	Type	Description
id	string	A unique identifying string for the item, provided by the restaurant.

NOTE: Avoid using special characters such as / (forward slash) or ; (semi-colon) which could disrupt the APIs that utilize item_id as the path parameter.
external_data	string	(optional) Free-form text field reserved for the restaurant’s use, e.g. for POS integrations. (max 1024 characters)
title	MultiLanguageText	The name of the item.
description	MultiLanguageText	(optional) Supplementary information describing the item.
image_url	string	(optional) URL pointing to an image of the item.
Image requirements:
File size < 25MB
JPG, WEBP or PNG format
320px ≤ Width ≤ 6000px
320px ≤ Height ≤ 6000px
price_info	PriceRules	Specifies the price to charge for ordering the item. Allows overrides dependent on the ordered item’s context.

Price should always be integer value (never decimals) because the price is set in the percent of local currency denomination (e.g., cents for US currency, not dollars).

Price should always be set even if price is 0.
quantity_info	QuantityConstraintRules	(optional) Constrains the quantities in which the item can be ordered. Only applies to items used within a modifier group. Allows overrides dependent on the ordered item’s context.
suspension_info	SuspensionRules	(optional) Suspends the item from sale, e.g. when out of stock, until a specified time. Allows overrides dependent on context.
modifier_group_ids	ModifierGroupsRules	(optional) Specifies the modifier groups to be associated with the item, allowing the user to make choices or bundle extras with their purchase. Allows overrides dependent on context.
tax_info	TaxInfo	Specifies the taxes applicable to the item.
nutritional_info	NutritionalInfo	(optional) Specifies the nutritional info for an item
dish_info	DishInfo	(optional) Defines the classifications for an item
visibility_info	VisibilityInfo	(optional) Defines when an item is visible to the user
tax_label_info	TaxLabelsRuleSet	(optional) The labels used to generate tax values
product_info	ProductInfo	(optional) Product identification information i.e. GTIN/UPC codes
bundled_items	[]BundledItems	(optional) The list of items that are bundled or always included as part of this item, but not shown/customizable by customers. (ie. Fries as part of a burger combo). These items are shown to customers when they are requesting a support/refund and not shown during initial purchase.
beverage_info	BeverageInfo	(optional) Additional information about food items. Such as caffeine amount
physical_properities_info	PhysicalPropertiesInfo	(optional) Additional product information related to products’ physical properties. ie. storage instructions, reusable packaging
medication_info	PhysicalPropertiesInfo	(optional) Additional product information related to products’ physical properties. ie. storage instructions, reusable packaging
selling_info	SellingInfo	(optional) Defines the selling information for an item
Request Body Parameters - PriceRules
Specifies the price to charge for ordering the item.

Name	Type	Description
price	int	Price of the item in the percent of local currency denomination, e.g. cents and 1/100 for yen.
core_price	int	(optional) The intrinsic value of the item, in the percent of local currency denomination, e.g. cents.

Used for refunds if the item is reported missing and in other cases where the intrinsic value of the item is needed.

Must be >= price.

Example Usage: A medium drink may be free (price=0) as part of a combo, but if reported missing the intrinsic value (corePrice) should be refunded to the customer.

Can be set for Items and Modifier Options but currently only used for determining value of Modifier Options.
container_deposit	int	(optional) Metadata on the amount of deposit charged for returnable bottles/containers, in the percent of local currency denomination, e.g. cents. Only for metadata, does not affect price when ordering.
overrides	PriceOverride[]	(optional) Overrides for the price in different contexts.
priced_by_unit	MeasurementUnit	(optional) “per measurement” unit the item price is based on.
Request Body Parameters - PriceOverride
Overrides the item price in a specified context

Name	Type	Description
context_type	string (enum)	Type of the context in which to override.

ALLOWED VALUES:
“MENU”
“ITEM”
“MODIFIER_GROUP”
context_value	string	Identifying string (id) for the specified context.
price	int	Price of the item in the percent of local currency denomination, e.g. cents and 1/100 for yen.
core_price	int	(optional) The intrinsic value of the item, in the percent of local currency denomination, e.g. cents.

Used for refunds if the item is reported missing and in other cases where the intrinsic value of the item is needed.

Must be >= price.

Example Usage: A medium drink may be free (price=0) as part of a combo, but if reported missing the intrinsic value (corePrice) should be refunded to the customer.

Can be set for Items and Modifier Options but currently only used for determining value of Modifier Options.
Request Body Parameters - QuantityConstraintRules
Applies constraints to the quantity in which an item can be ordered.

Name	Type	Description
quantity	QuantityConstraint	Default quantity constraints for the item.
overrides	QuantityConstraintOverride[]	(optional) Overrides for the quantity constraints in different contexts.
Request Body Parameters - QuantityConstraint
A set of rules imposed upon the quantity values selectable by the user.

Name	Type	Description
min_permitted	int	(optional) Minimum quantity allowed (inclusive).

Cannot be negative.

Note: When used in a modifier option, customers will be required to purchase the min_permitted quantity of this modifier option (i.e. customer will need to select this modifier option to purchase the item). If you want to set min_permitted to only apply if the customer chooses to add this modifier option, then set is_min_permitted_optional to TRUE. By doing so, the customer will have the choice to select this modifier option if they wish. If they do select it, only then they will be required to purchase at least the min_permitted quantity of this modifier option to purchase the item.

**If the sum of all required modifier options min_permitted values are greater than the max_permitted value for a modifier group, the item will be unorderable.
max_permitted	int	(optional) Maximum quantity allowed (inclusive).

max_permitted cannot be less than min_permitted.
is_min_permitted_optional	bool	(optional) If the modifier option selection is optional. . Should only be used in a modifier option.

When set to FALSE, customers will be required to purchase the min_permitted quantity of this modifier option (i.e. customer will need to select this modifier option to purchase the item).

When set to TRUE, customers will have the choice to select this modifier option if they wish. If they do select it, only then they will be required to purchase at least the min_permitted quantity of this modifier option to purchase the item.

Default value is FALSE
default_quantity	int	(optional) Default quantity that will be pre-selected.

default_quantity must be between min_permitted and max_permitted (inclusive)
charge_above	int	(optional) When provided, the item price will only be charged per quantity unit in excess of this amount. Can either be applied to an individual item or an entire modifier group.
charge_above and refund_under must either both be null or both be non-null.
Cannot be negative.
Cannot be greater than max_permitted.
Cannot be less than default_quantity.
Cannot be less than refund_under.
refund_under	int	(optional) When provided, the item price will be refunded per quantity unit chosen below this amount. Can either be applied to an individual item or an entire modifier group.
charge_above and refund_under must either both be null or both be non-null.
Cannot be negative.
Cannot be greater than max_permitted.
Cannot be greater than default_quantity.
Cannot be greater than charge_above.
min_permitted_unique	int	(optional) Minimum quantity of unique customization selections allowed (inclusive)

Cannot be negative. Can only be applied to modifier groups; cannot be used for individual modifier options.
max_permitted_unique	int	(optional) Maximum quantity of unique customization selections allowed (inclusive)

Cannot be less than min_permitted_unique. Can only be applied to modifier groups; cannot be used for individual modifier options.
Request Body Parameters - QuantityConstraintOverride
Overrides the quantity constraints in a specified context.

Name	Type	Description
context_type	string (enum)	Type of the context in which to override.

ALLOWED VALUES:
“MENU”
“ITEM”
“MODIFIER_GROUP”
context_value	string	Identifying string (id) for the specified context.
quantity	QuantityConstraint	Quantity constraints for the item in this context.
Request Body Parameters - SuspensionRules
Suspends the item from sale for a specified period of time.

Name	Type	Description
suspension	Suspension	(optional) Any active suspension for the item.
overrides	SupensionOverride[]	(optional) Overrides for the suspension in different contexts.
Request Body Parameters - Suspension
Describes why, and until when, an item is suspended from sale.

Name	Type	Description
suspend_until	int	(optional) The time at which the item will return to being available for sale, specified as a Unix timestamp in seconds since Jan 1, 1970. A null value, or time in the past, indicates that an item is available - otherwise it will be shown as “Sold Out” and unavailable to order.
reason	string	(optional) Describes the reason for the suspension.
Request Body Parameters - SuspensionOverride
Overrides an item’s suspension in a specified context.

Name	Type	Description
context_type	string (enum)	Type of the context in which to override.

ALLOWED VALUES:
“MENU”
“ITEM”
“MODIFIER_GROUP”
context_value	string	Identifying string (id) for the specified context.
suspension	Suspension	Suspension settings for the item in the context.
Request Body Parameters - ModifierGroupsRules
Specifies the modifier groups to be associated with the item, allowing the user to make choices or bundle extras with their purchase.

Name	Type	Description
ids	string[]	A list of the identifying strings (ids) of all modifier groups associated with the item.
overrides	ModifierGroupsOverride[]	(optional) Overrides for the list of modifier groups in different contexts.
Request Body Parameters - ModifierGroupsOverride
Overrides the modifier groups associated with an item in a specified context.

Name	Type	Description
context_type	string (enum)	Type of the context in which to override.

ALLOWED VALUES:
“MENU”
“ITEM”
“MODIFIER_GROUP”
context_value	string	Identifying string (id) for the specified context.
ids	string[]	A list of the identifying strings (ids) of all modifier groups associated with the item in this context.
Request Body Parameters - TaxInfo
Specifies how taxes are calculated from the menu item’s price. We support both tax-inclusive (vat_rate_percentage) and tax-exclusive (tax_rate) pricing models. Choose the one that is consistent with each store’s tax locality.

Name	Type	Description
tax_rate	0.0 ≤ float ≤ 100.0	(optional) The tax rate, to be charged on top of the provided menu item price. You would typically use this option if your menu item’s price does not include tax but needs to be charged on top of the order’s sub-total.
Note: This tax rate only applies to the first-level items within the order.
vat_rate_percentage	0.0 ≤ float ≤ 100.0	(optional) Value-added tax rate for the item. This is the amount of tax already included in the menu item’s price. This tax rate will not be additionally charged.
Request Body Parameters - NutritionalInfo
Specifies the nutritional info for an item.

Name	Type	Description
calories	EnergyInfo	(optional) Net energy content of the item, in calories
kilojoules	EnergyInfo	(optional) Net energy content of the item, in kilojoules
serving_size	MeasurementInterval	(optional) The amount per 1 serving size for a product. Ie. 100g per serving in a bag of chips
number_of_servings	int	(optional) The number of servings in the product ie. 3 servings for a 300g bag of chips with 100g per serving
number_of_servings_interval	Interval	(optional) The number of people the product serves (ie. serves 2-4 people)
net_quantity	MeasurementInterval	(optional) The net quantity of the product. Ie. 300g for a bag of chips
calories_per_serving	EnergyInfo	(optional) Energy content of the item per serving, in calories
kilojoules_per_serving	EnergyInfo	(optional) Energy content of the item per serving, in kilojoules
fat	NutrientInfo	(optional) Information on the fat nutrient of the item
saturated_fatty_acids	NutrientInfo	(optional) Information on the saturated fat nutrient of the item
carbohydrates	NutrientInfo	(optional) Information on the carbohydrates nutrient of the item
sugar	NutrientInfo	(optional) Information on the sugar nutrient of the item
protein	NutrientInfo	(optional) Information on the protein nutrient of the item
salt	NutrientInfo	(optional) Information on the salt nutrient of the item
allergens	[]string	(optional) List of allergens in the product
Request Body Parameters - MeasurementInterval
Name	Type	Description
measurement_type	string	One of MEASUREMENT_TYPE_WEIGHT, MEASUREMENT_TYPE_VOLUME, MEASUREMENT_TYPE_COUNT - the measurement type of the interval
weight_interval	WeightInterval	The weight interval for the measurement. Must be set if measurement_type is MEASUREMENT_TYPE_WEIGHT
volume_interval	VolumeInterval	The volume interval for the measurement. Must be set if measurement_type is MEASUREMENT_TYPE_VOLUME
count_interval	CountInterval	The count interval for the measurement. Must be set if measurement_type is MEASUREMENT_TYPE_COUNT
Request Body Parameters - Interval
The interval can behave as a single value (not an interval) if lower is equal to upper.

Name	Type	Description
lower	int	The lower value of the described closed interval. If undefined, the interval behaves as a left-unbounded/right-bounded closed interval. In E5 format ie. 123456 = 1.2345
upper	int	(optional) The upper value of the described closed interval. If undefined, the interval behaves as a left-bounded/right-unbounded closed interval. In E5 format ie. 123456 = 1.2345
Request Body Parameters - NutrientInfo
Name	Type	Description
amount	WeightInterval	Amount of the nutrient per serving
Request Body Parameters - WeightInterval
The interval can behave as a single value (not an interval) if lower is equal to upper.

Name	Type	Description
interval	Interval	The lower value of the described closed interval. If undefined, the interval behaves as a left-unbounded/right-bounded closed interval. In E5 format ie. 123456 = 1.2345
weight	Weight	The weight in the interval
Request Body Parameters - VolumeInterval
The interval can behave as a single value (not an interval) if lower is equal to upper.

Name	Type	Description
interval	Interval	The lower value of the described closed interval. If undefined, the interval behaves as a left-unbounded/right-bounded closed interval. In E5 format ie. 123456 = 1.2345
volume	Volume	The volume in the interval
Request Body Parameters - CountInterval
The interval can behave as a single value (not an interval) if lower is equal to upper.

Name	Type	Description
interval	Interval	The lower value of the described closed interval. If undefined, the interval behaves as a left-unbounded/right-bounded closed interval. In E5 format ie. 123456 = 1.2345
count	Count	The count in the interval
Request Body Parameters - Weight
Name	Type	Description
unit_type	string	One of WEIGHT_UNIT_TYPE_METRIC_GRAM, WEIGHT_UNIT_TYPE_METRIC_MICROGRAM, WEIGHT_UNIT_TYPE_METRIC_MILLIGRAM, WEIGHT_UNIT_TYPE_METRIC_KILOGRAM, WEIGHT_UNIT_TYPE_METRIC_TON, WEIGHT_UNIT_TYPE_IMPERIAL_AVOIRDUPOIS_OUNCE, WEIGHT_UNIT_TYPE_IMPERIAL_AVOIRDUPOIS_POUND. Must be set if unit_type is WEIGHT
Request Body Parameters - Volume
Name	Type	Description
unit_type	string	One of VOLUME_UNIT_TYPE_METRIC_LITER, VOLUME_UNIT_TYPE_METRIC_MILLILITER, VOLUME_UNIT_TYPE_IMPERIAL_FLUID_OUNCE, VOLUME_UNIT_TYPE_IMPERIAL_PINT, VOLUME_UNIT_TYPE_IMPERIAL_GALLON, VOLUME_UNIT_TYPE_IMPERIAL_QUART, VOLUME_UNIT_TYPE_IMPERIAL_CUP, VOLUME_UNIT_TYPE_IMPERIAL_TABLESPOON, VOLUME_UNIT_TYPE_IMPERIAL_TEASPOON. Must be set if unit_type is VOLUME
Request Body Parameters - Count
Name	Type	Description
unit_type	string	One of COUNT_UNIT_TYPE_CUSTOM, COUNT_UNIT_TYPE_PIECE, COUNT_UNIT_TYPE_SLICE, COUNT_UNIT_TYPE_TABLET, COUNT_UNIT_TYPE_CAPSULE. CUSTOM is for products that use a special unit like its own name as the count unit, e.g. 1 cookie, 1 candy bar. Must be set if unit_type is COUNT
custom_unit	string	Name of the custom unit (ie. 1 cookie) if the unit_type is CUSTOM
Request Body Parameters - EnergyInfo
Specifies the energy content of an item.

Name	Type	Description
energy_interval	Interval	The lower value of the described closed interval. If undefined, the interval behaves as a left-unbounded/right-bounded closed interval. In E5 format ie. 123456 = 1.2345
lower_range	int	(deprecated) The lower range of the energy content. This is used in various ways depending on the display_type.
upper_range	int	(deprecated) The upper range of the energy content. This is used in various ways depending on the display_type.
display_type	string	
ALLOWED VALUES:
“single_item”: takes the value of lower_range as is (e.g. “10”)
“double_items”: takes both lower_range and upper_range (e.g. “10/20”)
“additive_item”: takes the value of lower_range and prepends a plus (e.g. “+10”)
“multiple_items”: takes the value of lower_range and upper_range as a range (e.g. “10-20)
Request Body Parameters - DishInfo
Defines the classifications for an item.

Name	Type	Description
classifications	Classifications	(optional) Classifications of an item for supplemental information
Request Body Parameters - VisibilityInfo
Specifies when an item is visible to the user

Name	Type	Description
hours	VisibilityHours	(required) List of time periods when an item should be visible to the eater
Request Body Parameters - visibilityHours
Specifies when an item is visible to the user

Name	Type	Description
start_date	string	(optional) An ISO 8601 formatted date string specifying the start of the period when an item should be visible. For example 2019-12-29. Omitting this value means current day.
end_date	string	(optional) An ISO 8601 formatted date string specifying the end of the period when an item should be visible. For example 2019-12-30. Omitting this value means end of time.
hours_of_week	HoursOfWeek	(required) List of time of day and day of week when an item should be visible when it is between the start date and end date. At least one entry is required.
Request Body Parameters - HoursOfWeek
Specifies the time of day and day of week when an item is visible to the user

Name	Type	Description
day_of_week	string (enum)	The day of the week on which these hours will be applied.

ALLOWED VALUES:
“monday”
“tuesday”
“wednesday”
“thursday”
“friday”
“saturday”
“sunday”
time_periods	TimePeriod[]	The continuous time spans during which the item is visible.
Request Body Parameters - Classifications
Specifies the classifications for an item.

Name	Type	Description
can_serve_alone	boolean	(optional) Indicates whether the item can be served on its own.

This has implications in alcohol markets because in certain cases, alcohol must be sold with an entree (it cannot be sold alone). In that case, we want to know whether each item can qualify as an entree.

Alcoholic items that also qualify as entrees (e.g. beer braised chicken) can be sold alone.

If an item is not alcoholic, we still want to know if it’s considered an entree so we can determine if, for example, the eater can buy a non-entree alcohol item and combine it with this one.
is_vegetarian	boolean	(optional) Not used anymore. Please use DietaryLabelInfo instead.
alcoholic_items	int	(optional) Indicates if an item is alcoholic, and if so, how much alcohol content there is. For example, an item “six-pack beer” should have alcoholic_items set to 6.

A value of null or 0 indicates that the item is non-alcoholic. This field is only used in whitelisted alcohol markets.

IMPORTANT: Once a product is marked as alcoholic (by setting alcoholic_items to a value greater than 0), it will remain alcoholic even if you attempt to explicitly set it as non-alcoholic in future API updates. This behavior is intentional to ensure compliance and consistency across Uber systems. If a product was incorrectly marked as alcoholic and must be reverted, please contact Uber Eats Support to request a manual correction.
dietary_label_info	DietaryLabelInfo	(optional) Contains dietary labels.
instructions_for_use	string	(optional) Instructions for use/prepare the product (max 200 characters)
ingredients	[]string	(optional) ingredients of the product (max 50 ingredients)
additives	[]string	(optional) List of additives in the product
preparation_type	string	(optional) Information on how the dish is prepared. Must be PREPACKAGED or empty.
food_business_operator	FoodBusinessOperator	(optional) Specifies the food business operator of the product.
is_high_fat_salt_sugar	boolean	(optional) Indicates whether the item contains high fat/salt/sugar.
Request Body Parameters - FoodBusinessOperator
Name	Type	Description
name	string	Name of the food business operator.
address	string	Address of the food business operator.
Request Body Parameters - DietaryLabelInfo
Dietary labels visible to the user.

Name	Type	Description
labels	string[] (DietaryLabels)	(required) A list of strings from the allowed DietaryLabels table below which are applicable for the item/modifier option. This field must be set if dietary_label_info is set.

Note: Sending an empty array will delete existing labels.
Request Body Parameters - DietaryLabels
The possible dietary labels.

Dietary Label	Description
VEGAN	Item does not contain animal products. Vegan items are also vegetarian by definition.
VEGETARIAN	Item does not contain meat.
GLUTEN_FREE	Item does not contain gluten.
Request Body Parameters - ModifierGroup
A grouping of items that can be selected as part of the purchase of a parent item, allowing the user to customize the item by making choices or bundling extras with their order.

Name	Type	Description
id	string	A unique identifying string for the modifier group, provided by the restaurant.
external_data	string	(optional) Free-form text field reserved for the restaurant’s use, e.g. for POS integrations. (max 1024 characters)
title	MultiLanguageText	The displayed name of the modifier group.
quantity_info	QuantityConstraintRules	(optional) Constrains the quantities in which all items within the modifier group can be ordered. Allows overrides dependent on the ordered item’s context.
modifier_options	MenuEntity[]	A list of menu entity objects representing available item options for the modifier group - all entities must be of type “ITEM”.
display_type	string (enum)	(optional) Describes how this modifier group should be initially displayed - whether fully expanded (the default setting if this field is not provided), or collapsed.

ALLOWED VALUES:
“expanded”
“collapsed”
Request Body Parameters - TaxLabelsRuleSet
The labels used to generate tax values.

Name	Type	Description
default_value	TaxLabelsInfo	The default value used.
Request Body Parameters - TaxLabelsInfo
The labels and source data for an item.

Name	Type	Description
labels	string[] (enum)	A list of strings from the allowed enums. Allowed enums available in the TaxLabels table below. Category and Temperature Labels required.

For example, if you have an item with Tax Classifcation “Pre-Packaged Snack” that is unheated then you would send a list containing:

[“CAT_PREPACKAGED_FOOD”, “CAT_SNACK”, “TEMP_UNHEATED”]
source	string (enum)	Must be set to “MANUAL”.
Request Body Parameters - TaxLabels
The possible labels. Need to concat the value from “Category Labels” and “Temperature Labels”

Tax Classification	Description	Category Labels	Temperature Labels
Unheated Prepared Food	Items served at or below room temperature.

Examples: Fresh salads, sashimi, ceviche	CAT_PREPARED_FOOD	TEMP_UNHEATED
Unheated Deli Platter	Food items served together on a plate or tray. Usually from grocery stores.

Examples: Fruit platters, meat and cheese plates, cold sandwich trays	CAT_DELI_PLATTER	TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Unheated Food Sold by Weight/Volume	Food that’s measured or weighed and sold in a container.

Examples: Sliced deli meats and cheeses, cold deli salads	CAT_FOOD_BY_WT_VOL	TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Unheated Sandwich/Wrap	A combination of meat, vegetables, spreads and more. Sandwiches are served between 2 pieces of bread, wraps are served in a tortilla or flatbread.

NOTE: Only use this category for premade sandwiches and wraps sold in containers. Use “restaurant food” for sandwiches or wraps prepared fresh and served in a restaurant.

Examples: Tuna salad sandwich, chicken salad sandwich, veggie wraps	CAT_SANDWICH	TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Ice Cream (hand scooped)	A cold, sweet foods made from milk or yogurt.

Examples: Homemade ice cream cones, milkshakes	CAT_ICECREAM	TEMP_COLD
Pre-Packaged Food	Foods made in advance that usually are bought in containers.

Examples: Frozen meats, granola bars, canned vegetables	CAT_PREPACKAGED_FOOD	TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Pre-Packaged Ice Cream	Ice cream or frozen yogurt bought in a container typically greater than 1 pint.

Examples: Store-bought ice cream pints, pre-packaged frozen yogurt	CAT_PREPACKAGED_FOOD, CAT_ICECREAM	TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Pre-Packaged Snack	Snacks that come prepackaged from a manufacturer.

Examples: Potato chips, peanuts, pretzels	CAT_PREPACKAGED_FOOD, CAT_SNACK	TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Candy	A sweet food that comes packaged from a manufacturer.

Examples: Gummy bears, jelly beans, gum, chocolate bars,	CAT_CANDY	TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Candy Flour	Candy Flour	CAT_CANDY, TRAIT_FLOUR	TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Alcohol	Beverages containing alcohol.

Examples: Beer, wine, liquor	CAT_ALCOHOL	TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
100% Juice	Beverages that contain 100% juice with no additional ingredients other than water.

Examples: Orange juice, tomato juice, apple juice	CAT_JUICE, TRAIT_PCT_100	TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
70% - 99% Juice	Beverages that contain 70%-99% juice with no additional ingredients other than water.	CAT_JUICE, TRAIT_PCT_70TO99	TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
50% - 69% Juice	Beverages that contain 50%-69% juice with no additional ingredients other than water.	CAT_JUICE, TRAIT_PCT_50TO69	TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
25% - 49% Juice	Beverages that contain 25%-49% juice with no additional ingredients other than water.	CAT_JUICE, TRAIT_PCT_25TO49	TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
5% - 24% Juice	Beverages that contain 5%-24% juice with no additional ingredients other than water.	CAT_JUICE, TRAIT_PCT_5TO24	TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
1% - 4% Juice	Beverages that contain 1%-4% juice with no additional ingredients other than water.	CAT_JUICE, TRAIT_PCT_1TO4	TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Noncarbonated, unflavored/unsweetened water	Non-carbonated water with no flavoring or sweetners.

Examples: Aquafina, Dasani, Evian, Fiji	CAT_WATER, TRAIT_NONCARB, TRAIT_UNFLV_UNSWT, CONTAINER_BOTTLED	TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Noncarbonated, flavored/sweetened water	Noncarbonated drinks that contain a mix of fruit juices and other ingredients.

Examples: Vitamin water, Sobe, Fruit drinks	CAT_WATER, TRAIT_NONCARB, TRAIT_FLV_SWT, CONTAINER_BOTTLED	TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Carbonated, unflavored/unsweetened water	Carbonated water with no flavoring or sweetners.	CAT_WATER, TRAIT_CARB, TRAIT_UNFLV_UNSWT, CONTAINER_BOTTLED	TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Carbonated, flavored/sweetened water	Carbonated drinks that contain a mix of fruit juices and other ingredients.	CAT_WATER, TRAIT_CARB, TRAIT_FLV_SWT, CONTAINER_BOTTLED	TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Soft drink, bottled	Soft drink, bottled	CAT_SOFT_DRINK, CONTAINER_BOTTLED	TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Soft drink, noncarbonated and bottled	Noncarbonated bottled softdrink	CAT_SOFT_DRINK, TRAIT_NONCARB, CONTAINER_BOTTLED	TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Powdered bottled drink	Powdered drink Mix	CAT_POWDERED_DRINK, CONTAINER_BOTTLED	TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Energy bottled drink	Energy bottled drink	CAT_ENERGY_DRINK, CONTAINER_BOTTLED	TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Prepared drink	Prepared drink	CAT_PREPARED_DRINK	TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Bottled tea	Bottled tea	CAT_TEA, CONTAINER_BOTTLED	TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Bottled coffee	Bottled coffee	CAT_COFFEE, CONTAINER_BOTTLED	TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Bottled milk cocoa	Bottled milk cocoa	CAT_MILK_COCOA, CONTAINER_BOTTLED	TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Sporting Activities Clothing/Equipment	Generally taxable items; athletic uniforms and clothing don’t follow same exemptions as other clothing.

Examples: bike jerseys, tennis rackets, etc.	CAT_SPORTING_CLOTHING	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Bathing Suits	Have different taxability than regular clothing items.

Examples: swim trunks, bikinis, etc.	CAT_BATHING_SUITS	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Other Clothing	Exempt in some states as well as has Sales Tax Holiday implications.

Examples: Tshirts, sweatshirts, pants, etc.	CAT_CLOTHING	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Costumes	Have different taxability than regular clothing items.

Examples: Halloween costumes, masks, etc.	CAT_COSTUMES	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Disposable Glove	Exemptions in some states that differ from both clothing and TPP.

Examples: rubber gloves, disposable PPE gloves, etc.	CAT_DISPOSABLE_GLOVES	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Protective/Safety Clothing	Exemptions in some states that differ from both clothing and TPP.

Examples: Hard hats, protective gloves, etc.	CAT_PROTECTIVE_CLOTHING	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Footwear and Accessories	Examples: Sandals, sneakers, etc.	CAT_FOOTWEAR	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Computer Hardware	Examples: Laptops, Monitors, etc.	CAT_COMP_HARDWARE	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Batteries	Examples: AA batteries, AAA batteries, etc.	CAT_BATTERIES	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Office/School Supplies	Examples: Notebooks, etc.	CAT_SCHOOL_SUPPLIES	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Infant Diapers	N/A	CAT_DIAPERS	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Baby Wipes	N/A	CAT_BABY_WIPES	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Pacifiers	N/A	CAT_PACIFIERS	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Baby Formula	N/A	CAT_BABY_FORMULA	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Condoms	N/A	CAT_CONDOMS	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Personal Lubricants	N/A	CAT_PERSONAL_LUBRICANTS	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Pregnancy Tests	N/A	CAT_PREGNANCY_TEST	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Miscellaneous Equipment, Devices Sold Under Prescription	Examples: Inhalers, etc.	CAT_PRESCRIPTION_DEVICES	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Prescription Drugs	Any item requiring a prescription to be sold.	CAT_PRESCRIPTION_DRUGS	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
OTC Medications	Examples: Advil, Tylenol, Zyrtec, etc.	CAT_OTC_MEDICATION	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
First Aid Kits	N/A	CAT_FIRST_AID_KITS	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Bandages	N/A	CAT_BANDAGES	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Petroleum Jelly	N/A	CAT_PETROLEUM_JELLY	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Medicated Items	Grooming or hygiene products with an added medicine component, such as medicated lip balm, etc.	CAT_MEDICATED_ITEMS	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Pet Food	All pet food, including treats.	CAT_PET_FOOD	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Printing-Postage	Examples: Stamps, envelopes, etc.	CAT_POSTAGE	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Nontaxable/Tax Exempt	Any item that is nontaxable or tax-exempt.	CAT_NON_TAXABLE	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Gift Cards	N/A	CAT_GIFT_CARDS	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Storm Preparedness Items	Examples: Flashlights, fire extinguishers, portable radios, etc.	CAT_STORM_PREP_ITEMS	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
TPP / Goods	Please select this tax category for all generally taxable items for which a separate category is not available.	CAT_TPP	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Milk Substitutes	Examples: Almond milk, oat milk, etc.	CAT_MILK_SUBS	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Beer	N/A	CAT_BEER	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Wine	N/A	CAT_WINE	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Liquor	N/A	CAT_LIQUOR	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Non Alcoholic Beer or Mocktails	N/A	CAT_NON_ALCOHOLIC_BEER	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Juice (Non Carbonated/Under 100%)	Examples: Gatorade, Vitamin Water, etc.	CAT_JUICE_NON_CARBONATED	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Newspaper	N/A	CAT_NEWSPAPERS	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Magazines	N/A	CAT_MAGAZINES	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Toilet Tissue	N/A	CAT_TOILET_PAPER	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Disposable Paper Products	Examples: Kleenex, paper towels, etc.	CAT_PAPER_PRODUCTS	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Vitamins and Supplements	Examples: Vitamins, health supplements, or anything with a “Supplement” label rather than “Nutritional Facts” (5 Hour Energy, etc.)	CAT_SUPPLEMENTS	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Contact Solution	N/A	CAT_CONTACT_LENS_SOLUTION	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Feminine Hygiene Products	N/A	CAT_FEMININE_HYGIENE_PRODUCTS	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Hand Sanitizer	N/A	CAT_HAND_SANITIZER	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Lip Balm	Any non-medicated lip balm.	CAT_LIP_BALM	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Sunscreen	N/A	CAT_SUNSCREEN	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Toothpaste	N/A	CAT_TOOTHPASTE	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Toothbrush	N/A	CAT_TOOTHBRUSH	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Insecticides, Herbicides, Fungicides	N/A	CAT_INSECTICIDES	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Fertilizer	N/A	CAT_FERTILIZER	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Vegetable/Fruit Plants	Any plants or trees that will bear fruits or vegetables.	CAT_FRUIT_VEG_PLANTS	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Firewood	N/A	CAT_FIREWOOD	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Lighter Fluid	N/A	CAT_LIGHTER_FLUID	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Charcoal Briquettes	N/A	CAT_CHARCOAL_BRIQUETTES	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Propane	N/A	CAT_PROPANE	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Seeds (Human Consumption)	Examples: Sunflower seeds, chia seeds, and other seeds meant for human consumption.	CAT_SEEDS	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Bakery Item (Grocery Stores)	Any packaged item sold in the “bakery” section of a grocery store. Examples: Boxed cupcakes, loaves of bread, etc.	CAT_BAKERY_ITEM_GROCERY_STORE	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Candy-coated nuts	Candy coated nuts.

Examples: Chocolate Covered Almonds, Candied Pecans, Jordan Almonds.	CAT_CANDY_COATED_NUTS	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Chewing Gum	Chewing Gum.	CAT_GUM	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Chocolate or Chocolate Substitute Candy	Chocolate without flour.

Examples: Hershey Kisses, Chocolate Bars.	CAT_CHOCOLATE	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Confectionary products	Confectionary products that are not candy.

Examples: Macaroons, Bakalva	CAT_CONFECTIONARY	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
50-25% Juice	Pure Juice Content - 25% to 50%.	CAT_JUICE_NON_CARBONATED_50TO25	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
99-51% Juice	Pure Juice Content - 51% or More.	CAT_JUICE_NON_CARBONATED_99TO51	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Cider or perry	Hard Cider.	CAT_CIDER	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Fortified wine	Fortified wine.	CAT_FORTIFIED_WINE	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Ice for Consumption - More Than 10 lbs	Ice for Consumption - More Than 10 lbs.	CAT_ICE_MORE_THAN_10LBS	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Meal Replacement	Meal Replacement.	CAT_MEAL_REPLACEMENT	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Nutritional Shakes	Nutritional Shakes.	CAT_NUTRITIONAL_SHAKES	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Sparkling wine	Sparkling wine.	CAT_SPARKLING_WINE	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Butter	Butter.	CAT_PREPACKAGED_FOOD_BUTTER	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Cakes and pies and pastries	Cakes and pies and pastries.	CAT_PREPACKAGED_FOOD_CAKES	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Canned or jarred beans	Canned or jarred beans.	CAT_PREPACKAGED_FOOD_CANNED_BEANS	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Canned or jarred fruit	Canned or jarred fruit.	CAT_PREPACKAGED_FOOD_CANNED_FRUIT	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Canned or jarred vegetables	Canned or jarred vegetables.	CAT_PREPACKAGED_FOOD_CANNED_VEGETABLES	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Cereals	Cereals.

Examples: Fruit Loops, Cheerios, etc.	CAT_PREPACKAGED_FOOD_CEREALS	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Cheese	Packaged Cheese.	CAT_PREPACKAGED_FOOD_CHEESE.	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Crackers	Crackers.

Examples: Ritz.	CAT_PREPACKAGED_FOOD_CRACKERS	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Desserts and dessert toppings	Desserts and dessert toppings.	CAT_PREPACKAGED_FOOD_DESSERTS	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Edible ice cream cups or cones	Edible ice cream cups or cones.	CAT_PREPACKAGED_FOOD_ICE_CREAM_CONE	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Edible oils and fats	Edible oils and fats.	CAT_PREPACKAGED_FOOD_EDIBLE_OILS	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Eggs and egg substitutes	Eggs and egg substitutes.	CAT_PREPACKAGED_FOOD_EGGS	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Fresh bread	Fresh bread.	CAT_PREPACKAGED_FOOD_FRESH_BREAD	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Health or Breakfast Bars	Health or Breakfast Bars.	CAT_PREPACKAGED_FOOD_SNACK_HEALTH_BARS	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Honey	Honey.	CAT_PREPACKAGED_FOOD_HONEY	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Infant Foods	Infant Foods.	CAT_PREPACKAGED_FOOD_INFANT_FOOD	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Instant Coffee	Instant Coffee.	CAT_PREPACKAGED_FOOD_INSTANT_COFFEE	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Jams or jellies or fruit preserves	Jams or jellies or fruit preserves.	CAT_PREPACKAGED_FOOD_JAMS	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Nut or mixed spreads	Nut or mixed spreads.	CAT_PREPACKAGED_FOOD_NUT_SPREADS	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Pickles and relish and olives	Pickles and relish and olives.	CAT_PREPACKAGED_FOOD_PICKLES	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Plain pasta and noodles	Plain pasta and noodles.	CAT_PREPACKAGED_FOOD_PASTA	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Popcorn - Plain	Popcorn - Plain.	CAT_PREPACKAGED_FOOD_POPCORN	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Salt preserved seafoods	Salt preserved seafoods.	CAT_PREPACKAGED_FOOD_SALT_PRESERVED_SEA_FOOD	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Sauces and spreads and condiments	Sauces and spreads and condiments.	CAT_PREPACKAGED_FOOD_CONDIMENTS	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Seasonings and preservatives	Seasonings and preservatives.	CAT_PREPACKAGED_FOOD_SEASONING	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Shelf stable milk	Shelf stable milk.	CAT_PREPACKAGED_FOOD_SHELF_STABLE_MILK	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Shelf Stable Prepared Potatoes or Rice or Pasta or Stuffing	Shelf Stable Prepared Potatoes or Rice or Pasta or Stuffing.	CAT_PREPACKAGED_FOOD_SHELF_STABLE_POTATOES	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Shelf stable prepared soups or stews	Shelf stable prepared soups or stews.	CAT_PREPACKAGED_FOOD_SHELF_STABLE_SOUP	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Tomato purees	Tomato purees.	CAT_PREPACKAGED_FOOD_TOMATO_PUREE	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Crisps or Chips or Pretzels or Mixes	Crisps or Chips or Pretzels or Mixes.	CAT_PREPACKAGED_FOOD_SNACK_CHIPS	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Nuts or Dried Fruits	Nuts or Dried Fruits.	CAT_PREPACKAGED_FOOD_SNACK_NUTS	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Snack Bars	Snack Bars.	CAT_PREPACKAGED_FOOD_SNACK_SNACK_BARS	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Sweet Biscuits or Cookies	Sweet Biscuits or Cookies.	CAT_PREPACKAGED_FOOD_SNACK_COOKIES	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Prepared salads	Prepared salads.	CAT_PREPARED_FOOD_PREPARED_SALADS	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Prepared Side Dishes	Prepared Side Dishes.

Examples: Mashed Potatoes, fries, etc.	CAT_PREPARED_FOOD_PREPARED_SIDE_DISHES	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Fresh fruits	Fresh fruits.	CAT_PREPACKAGED_FOOD_FRESH_FRUITS	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Facial Tissues	Facial Tissues.	CAT_PAPER_PRODUCTS_FACIAL_TISSUES	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Paper napkins or serviettes	Paper napkins or serviettes.	CAT_PAPER_PRODUCTS_PAPER_NAPKINS	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Paper Towels	Paper Towels.	CAT_PAPER_PRODUCTS_PAPER_TOWELS	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Markers	Markers.	CAT_SCHOOL_SUPPLIES_MARKERS	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Paper Pads or Notebooks	Paper Pads or Notebooks.	CAT_SCHOOL_SUPPLIES_NOTEBOOKS	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Pencils	Pencils.	CAT_SCHOOL_SUPPLIES_PENCILS	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Pens	Pens.	CAT_SCHOOL_SUPPLIES_PENS	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Antacids and antiflatulents	Antacids and antiflatulents.

Examples: Tums, Pepto Bismol, Alka-Seltzer.	CAT_OTC_MEDICATION_ANTACIDS	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Antidiarrheals	Antidiarrheals.

Examples: Imodium	CAT_OTC_MEDICATION_ANTIDIARRHEALS	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Antihistamines or H1 blockers	Allergy medications.

Examples: Claritin, Zyrtec, Allegra, Benadryl	CAT_OTC_MEDICATION_ANTIHISTAMINES	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Combination cold remedies	Combination cold remedies.

Examples: Dayquil, Nyquil	CAT_OTC_MEDICATION_COLD_REMEDIES	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Decongestants, expectorants, and mucolytics	Decongestants, expectorants, and mucolytics.	CAT_OTC_MEDICATION_DECONGESTANTS	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Estrogens and progestins and internal contraceptives	Estrogens and progestins and internal contraceptives.	CAT_OTC_MEDICATION_ESTROGENS	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Ibuprofen	Ibuprofen.	CAT_OTC_MEDICATION_IBUPROFEN	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Laxatives	Laxatives.	CAT_OTC_MEDICATION_LAXATIVES	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Nasal Decongestants	Nasal Decongestants.	CAT_OTC_MEDICATION_NASAL_DECONGESTANTS	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Nutritional supplements	Nutritional supplements.	CAT_NUTRITION_SUPPLEMENT	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Stimulants and Anorexiants	Stimulants and Anorexiants.	CAT_OTC_MEDICATION_STIMULANTS	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Air Freshener	Air Freshener.	CAT_TPP_AIR_FRESHENER	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Antifreeze	Antifreeze.	CAT_ANTI_FREEZE	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Astringents	Astringents.

Examples: Clean and Clear deep cleaning astringent	CAT_OTC_MEDICATION_ASTRINGENTS	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Bath Gels	Bath Gels.	CAT_TPP_BATH_GELS	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Bleaches	Bleaches.	CAT_TPP_BLEACHES	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Brake oil	Brake oil.	CAT_OIL	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Camping and outdoor equipment	Camping and outdoor equipment.

Examples: Tents, campfire grill	CAT_TPP_CAMPING_EQUIPMENT	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Candle	Candles.	CAT_TPP_CANDLE	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Cigarette lighters or flints	Cigarette lighters or flints.	CAT_TPP_CIGARETTE_LIGHTERS	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Cleaning Equipment and Supplies	Cleaning Equipment and Supplies.	CAT_TPP_CLEANING_EQUIPMENT	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Cosmetics	Cosmetics.	CAT_TPP_COSMETICS	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Dental Floss	Dental Floss.	CAT_TPP_DENTAL_FLOSS	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Deodorants	Deodorants.	CAT_TPP_DEODORANTS	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Dishwashing Products	Dishwashing Products.	CAT_TPP_DISH_WASHING_PRODUCTS	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Disposable Personal Wipes	Disposable Personal Wipes.	CAT_PAPER_PRODUCTS_PERSONAL_WIPES	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Disposable drinking straws	Disposable drinking straws.	CAT_PAPER_PRODUCTS_DISPOSABLE_STRAWS	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Disposable Kitchenware	Disposable plates, disposable utensils, disposable cups.	CAT_PAPER_PRODUCTS_DISPOSABLE_KITCHENWARE	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Drinkware	Drinkware. Examples: Glasses, Mugs, Cups	CAT_TPP_DRINK_WARE	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Food Storage Containers	Food Storage containers, Tupperware, etc	CAT_TPP_CONTAINERS	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Kitchen Tools and Utensils	Any kitchen tools and utensils. Examples: Forks, Knives, ladles, spatulas, can opener, etc.	CAT_TPP_UTENSILS	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Drain cleaner	Drain cleaner.	CAT_TPP_DRAIN_CLEANER	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Engine Oil	Engine Oil.	CAT_ENGINE_OIL	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Flashlight	Flashlight.	CAT_FLASHLIGHT	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Gloves, Mittens	Gloves, Mittens.	CAT_GLOVES	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Hair Combs or Brushes	Hair Combs or Brushes.	CAT_TPP_COMBS	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Hand or Body Lotion or Oil	Hand or Body Lotion or Oil.	CAT_TPP_BODY_LOTION	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Hand Tools	Hand Tools.	CAT_TPP_HAND_TOOLS	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Headphones	Headphones.	CAT_TPP_HEADPHONES	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Insect Repellant	Insect Repellant.	CAT_TPP_INSECT_REPELLENT	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Laundry Products	Laundry Products.	CAT_TPP_LAUNDRY_PRODUCTS	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Masks or accessories	Masks or accessories.	CAT_TPP_MASKS	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Medical Thermometers and Accessories	Medical Thermometers and Accessories.	CAT_THERMOMETERS	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Mouthwash	Mouthwash.	CAT_TPP_MOUTH_WASH	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Nail Clippers	Nail Clippers.	CAT_TPP_NAIL_CLIPPERS	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Nail Polish Remover	Nail Polish Remover.	CAT_TPP_NAIL_POLISH_REMOVER	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Perfumes or Colognes or Fragrances	Perfumes or Colognes or Fragrances.	CAT_TPP_PERFUMES	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Playing Cards	Playing Cards.	CAT_TPP_PLAYING_CARDS	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Razors	Razors.	CAT_TPP_RAZORS	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Scouring pads	Scouring pads.	CAT_TPP_SCOURING_PADS	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Shampoos	Shampoos.	CAT_TPP_SHAMPOOS	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Shaving Creams	Shaving Creams.	CAT_TPP_SHAVING_CREAMS	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Skin Care Products	Skin Care Products. Examples: Face moisturizer, Aveeno	CAT_TPP_SKIN_CARE_PRODUCTS	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Sponges	Sponges.	CAT_TPP_SPONGES	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Standard envelopes	Standard envelopes.	CAT_TPP_ENVELOPES	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Tape	Tape.	CAT_TPP_TAPE	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Toys and Games	Toys and Games.	CAT_TPP_TOYS	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Trash bags	Trash bags.	CAT_TPP_TRASH_BAGS	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Umbrellas	Umbrellas.	CAT_TPP_UMBRELLAS	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Ice Cream (Larger than Pint)	Ice Cream (Larger than Pint)	CAT_ICE_CREAM_PINTS	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Combo Meals or Gift Baskets	Combos or bundles that have different taxability when items are sold combined or bundled.	CAT_COMBOS_BUNDLES	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Cannabis	The product contains cannabis.	CAT_CANNABIS	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Books	Books (not like Magazines or Newspaper).	CAT_BOOK	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Child/Baby Car Seats	Car seats for children or babies.	CAT_CHILD_CAR_SEAT	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Child/Baby Clothing	Clothing for children/ babies, up to young teens. Excludes older teens and up. Excludes costumes and protective garments/accessories like sports equipment/gear.	CAT_CHILD_CLOTHING	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Sustainable Packaging	Take out boxes for food that are green or sustainable.	CAT_SUSTAINABLE_PACKAGING	Optional, can be empty. If provided, TEMP_HEATED or TEMP_UNHEATED or TEMP_COLD
Request Body Parameters - ProductInfo
Product identification information i.e. UPC code

Name	Type	Description
target_market	integer	(optional) Target market for the product. Values could be ISO 3166 Numeric code: https://en.wikipedia.org/wiki/ISO_3166-1. In addition value 1 for Global and 97 for European Union.
gtin	string	(optional) GTIN for product, which could be UPC/EAN code.
plu	string	(optional) If the product is fresh produce, it can be identified using PLU code. https://www.ifpsglobal.com/plu-codes
merchant_id	string	(optional) If product doesn’t have gtin or plu, item can be identified using merchant’s internal id.
product_type	string	(optional) The product type associated with the item. Can be set along with GITN/PLU/MerchantID. See list of product types
product_traits	[]string	(optional) A list of the product traits associated with the item. Can be set along with GITN/PLU/MerchantID. See list of product traits.
countries_of_origin	[]string	(optional) The countries of origin of the product
Request Body Parameters - BundledItems
These items are always included as part of other items and not shown & customizable to Eaters.

Name	Type	Description
item_id	string	Reference to the existing item ID.
core_price	int	The intrinsic value of this bundled item.
included_quantity	int	The quantity of this item that is included.
Request Body Parameters - PhysicalPropertiesInfo
Additional product information related to products’ physical properties.

Name	Type	Description
reusable_packaging	boolean	Indicates if the product comes in reusable packaging.
storage_instructions	string	(optional) Instructions for storage. (max 200 characters)
Request Body Parameters - BeverageInfo
Additional information about food items. Such as caffeine amount.

Name	Type	Description
caffeine_amount	integer	(optional) Amount of caffeine in the beverage in milligrams (mg).
alcohol_by_volume	int	(optional) Percentage of alcohol in E2 format. ie. 1275 is 12.75%
coffee_info	CoffeeInfo	(optional) Specifies additional coffee info
Request Body Parameters - CoffeeInfo
Name	Type	Description
coffee_bean_origin	[]string	(optional) List of countries of the coffee bean origin
Request Body Parameters - MedicationInfo
Name	Type	Description
medical_prescription_required	boolean	(optional) Specifies if prescription is required for the medication.
Request Body Parameters - SellingInfo
Defines the selling information for an item.

Name	Type	Description
selling_options	SellingOption[]	List containing information about how an item can be sold by.
Request Body Parameters - SellingOption
Contains the information about how an item can be sold by.

Name	Type	Description
sold_by_unit	MeasurementUnit	(optional) Describes the measurement unit an item can be sold by.
quantity_constraints	SellingQuantityConstraint	(optional) Describes the constraints that an item has in a particular SellingOption.
priced_by_to_sold_by_unit_conversion_info	PricedByToSoldByUnitConversionInfo	(optional) Describes conversion info between “priced_by” and “sold_by” quantities.
Request Body Parameters - MeasurementUnit
Describes a measurement unit.

Name	Type	Description
measurement_type	string (enum)	Describes the measurement unit an item can be sold by.

ALLOWED VALUES:
MEASUREMENT_TYPE_COUNT
MEASUREMENT_TYPE_WEIGHT
MEASUREMENT_TYPE_VOLUME
MEASUREMENT_TYPE_LENGTH
Defaults to MEASUREMENT_TYPE_INVALID if not provided.
length_unit	string (enum)	(optional) Describe in which unit the type MEASUREMENT_TYPE_LENGTH is measured in. Must be set if MEASUREMENT_TYPE_LENGTH is set.

ALLOWED VALUES:
LENGTH_UNIT_TYPE_METRIC_METER
LENGTH_UNIT_TYPE_METRIC_MILLIMETER
LENGTH_UNIT_TYPE_METRIC_CENTIMETER
weight_unit	string (enum)	(optional) Describe in which unit the type MEASUREMENT_TYPE_WEIGHT is measured in. Must be set if MEASUREMENT_TYPE_WEIGHT is set.

ALLOWED VALUES:
WEIGHT_UNIT_TYPE_METRIC_KILOGRAM
WEIGHT_UNIT_TYPE_METRIC_GRAM
WEIGHT_UNIT_TYPE_METRIC_MILLIGRAM
WEIGHT_UNIT_TYPE_IMPERIAL_POUND
WEIGHT_UNIT_TYPE_IMPERIAL_OUNCE
volume_unit	string (enum)	(optional) Describe in which unit the type MEASUREMENT_TYPE_VOLUME is measured in. Must be set if MEASUREMENT_TYPE_VOLUME is set.

ALLOWED VALUES:
VOLUME_UNIT_TYPE_US_FLUID_OUNCE
VOLUME_UNIT_TYPE_METRIC_LITER
VOLUME_UNIT_TYPE_METRIC_MILLILITER
Request Body Parameters - SellingQuantityConstraint
Describes the constraints that an item has in a particular SellingOption.

Name	Type	Description
min_permitted	float	(optional) Minimum quantity of total items allowed (inclusive). Max precision: 5 decimal places after the decimal point (e.g 0.12345)
max_permitted	float	(optional) Maximum quantity of total items allowed (inclusive). Max precision: 5 decimal places after the decimal point (e.g 0.12345)
increment	float	(optional) Incremental quantity that is allowed on quantity adjustment. Max precision: 5 decimal places after the decimal point (e.g 0.12345)
default_quantity	float	(optional) Default quantity that would be pre-selected. Max precision: 5 decimal places after the decimal point (e.g 0.12345)
Request Body Parameters - PricedByToSoldByUnitConversionInfo
Describes conversion info between “priced_by” and “sold_by” quantities.

Name	Type	Description
conversion_rate	float	(optional) The conversion ratio. Usage: “priced_by” quantity = “sold_by” quantity * conversionRate. Max precision: 5 decimal places after the decimal point (e.g 0.12345)
Request Body Example
A variety of example menu payloads are provided here: Example Menu Payloads

Response
Status-Code: 204 No Content

This endpoint returns an empty response body. To get full menu information for a store, use the Get Menu API.