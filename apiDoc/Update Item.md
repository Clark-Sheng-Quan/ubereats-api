Update Item
POST
https://api.uber.com/v2/eats/stores/{store_id}/menus/items/{item_id}
Access to These APIs May Require Written Approval From Uber

Uber’s APIs are always under development and as such are subject to changes according to our Versioning & Upgrade policy. As part of Uber’s ongoing privacy improvements, we’ve updated our Developer API program with new scope access policies for third party applications. For further information, please refer to our Getting Started guide in the navigation panel.

Disclaimer: If you have not used upload menu endpoint before, you might receive a 404 error while using update item endpoint. To avoid it, please use the upload menu endpoint once before using update item.

This Update Item endpoint updates an individual item within a menu. This allows you to make smaller edits without needing to send the entire menu. This endpoint performs sparse updates, meaning that it will only update a field if it is specified.

Authorization
OAuth 2.0 Bearer token with the eats.store scope. For more information, see Authentication.

Path Parameters
Name	Type	Description
store_id	string	Unique identifier representing a store.
item_id	string	Unique identifier representing an item.
Field Behavior / Validation Rules
Alcoholic Product Classification
Once a product is marked as alcoholic (by setting alcoholic_items to a value greater than 0 in the classifications object), it will remain alcoholic even if you attempt to explicitly set it as non-alcoholic in future API updates. This behavior is intentional to ensure compliance and consistency across Uber systems.

If a product was incorrectly marked as alcoholic and must be reverted, please contact Uber Eats Support to request a manual correction.

For more details, see the alcoholic_items field in the Classifications section.

Request Body Parameters
Request Body Parameters - UpdateItemConfiguration
A configuration specifying how to update an item

Name	Type	Description
price_info	PriceRules	(optional) Specifies the price to charge for ordering the item. Allows overrides dependant on the ordered item’s context
suspension_info	SuspensionRules	(optional) Suspends the item from sale, e.g. when out of stock, until a specified time. Allows overrides dependent on context
menu_type	string (enum)	(optional) Menu type to update, menus must be split by PUT api before using. Currently we only support item price and item availability differentiation.

ALLOWED VALUES:
MENU_TYPE_FULFILLMENT_DELIVERY
MENU_TYPE_FULFILLMENT_PICK_UP
MENU_TYPE_FULFILLMENT_DINE_IN
Defaults to MENU_TYPE_FULFILLMENT_DELIVERY if not provided. NOTE: MENU_TYPE_FULFILLMENT_DINE_IN is enabled in Australia and NZ only
product_info	ProductInfo	(optional) Product identification information i.e. GTIN/UPC codes
classifications	Classifications	(optional) Classifications of an item for supplemental information
beverage_info	BeverageInfo	(optional) Additional information about food items. Such as caffeine amount
physical_properties_info	PhysicalPropertiesInfo	(optional) Additional product information related to products’ physical properties. ie. storage instructions, reusable packaging
medication_info	MedicationInfo	(optional) Additional information about medications
nutritional_info	NutritionalInfo	(optional) Specifies the nutritional info for an item
selling_info	SellingInfo	(optional) Defines the selling information for an item
Request Body Parameters - PriceRules
Specifies the price to charge for ordering the item.

Name	Type	Description
price	int	Price of the item in the lowest local currency denomination, e.g. cents.

Note: Make sure the item price doesn’t exceed the maximum allowed value
core_price	int	(optional) The intrinsic value of the item, in the lowest local currency denomination, e.g. cents.

Used for refunds if the item is reported missing and in other cases where the intrinsic value of the item is needed.

Must be >= price.

Example Usage: A medium drink may be free (price=0) as part of a combo, but if reported missing the intrinsic value (corePrice) should be refunded to the customer.

Can be set for Items and Modifier Options but currently only used for determining value of Modifier Options.
container_deposit	int	(optional) Metadata on the amount of deposit charged for returnable bottles/containers, in the lowest local currency denomination, e.g. cents. Only for metadata, does not affect price when ordering.
overrides	PriceOverride[]	(optional) Overrides for the price in different contexts.
priced_by_unit	MeasurementUnit	(optional) “per measurement” unit the item price is based on.
Example Price Change Request

{
  "price_info": {
    "price": 1300, // price in cents
    "overrides": [],
    "container_deposit": 100 // container deposit in cents
  }
}
Response

Status-Code: 204 No Content
Request Body Parameters - PriceOverride
Overrides the item price in a specified context

Name	Type	Description
context_type	string (enum)	Type of the context in which to override.

ALLOWED VALUES:
“MENU”
“ITEM”
“MODIFIER_GROUP”
context_value	string	Identifying string (id) for the specified context.
price	int	Price of the item in the lowest local currency denomination, e.g. cents.
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
Request Body Parameters - ProductInfo
Product identification information i.e. UPC code

Name	Type	Description
target_market	string	(optional) Target market for the product. ISO 3166 2-letter code: https://en.wikipedia.org/wiki/ISO_3166-1. In addition, values “ALL” (all markets) and “EU” (European Union) are also supported.
gtin	string	(optional) GTIN for product, which could be UPC/EAN code.
plu	string	(optional) If the product is fresh produce, it can be identified using PLU code. https://www.ifpsglobal.com/PLU-Codes
merchant_id	string	(optional) If product doesn’t have gtin or plu, item can be identified using merchant’s internal id.
product_type	string	(optional) The product type associated with the item. Can be set along with GITN/PLU/MerchantID. See list of product types
product_traits	[]string	(optional) A list of the product traits associated with the item. Can be set along with GITN/PLU/MerchantID. See list of product traits.
countries_of_origin	[]string	(optional) The countries of origin of the product
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
Request Body Parameters - PhysicalPropertiesInfo
Additional product information related to products’ physical properties.

Name	Type	Description
reusable_packaging	boolean	(optional) Indicates if the product comes in reusable packaging.
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
POST /v2/eats/stores/{store_id}/menus/items/{item_id}

{
  "suspension_info": {
    "suspension": null,
    "overrides": [
      {
        "context_type": "MODIFIER_GROUP",
        "context_value": "size",
        "suspension": {
          "suspend_until": 8640000000,
          "reason": null
        }
      }
    ]
  },
  "product_info": {
    "target_market": "EU",
    "gtin": "1354435445"
  }
}
Response
Status-Code: 204 No Content
This endpoint returns an empty response body.