<?php

namespace App\Http\Controllers;

use App\Models\Link;
use App\Models\User;
use App\Http\Traits\ShopifyOrderTrait;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Exists;

class LinkController extends Controller
{
    use ShopifyOrderTrait;
    public function saveLink(Request $request)
    {
        $user = auth()->user();
        $data = $request->all();
        Log::info('Data received for saving link:', ['data' => $data]);
        Log::info('Additional Settings Data received:', ['additionalSettingsData' => $data['additionalSettingsData'] ?? 'NOT_FOUND']);

        // Use the Link model's validation rules with per-user uniqueness
        $validator = Validator::make($data, [
            'linkName' => [
                'required',
                'string',
                'max:255',
                Rule::unique('links', 'link_name')
                    ->where('user_id', $user->id)
            ],
            'linkId' => 'required|string',
            'selectedProductItems' => 'required|array|min:1',
            'selectedProductItems.*.productId' => 'required',
        ], [
            'linkName.required' => 'The link name is required',
            'linkName.unique' => 'You already have a link with this name. Please choose a different name.',
            'linkName.max' => 'The link name may not be greater than 255 characters.',
            'linkId.required' => 'The link ID is required',
            'selectedProductItems.required' => 'At least one product must be selected',
            'selectedProductItems.min' => 'At least one product must be selected',
            'selectedProductItems.*.productId.required' => 'Product ID is required',
        ]);

        if ($validator->fails()) {
            Log::info('Validation failed:', ['errors' => $validator->errors()]);
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }
        
        \DB::beginTransaction();
        try {
            // Ensure we have a unique link_url
            $linkUrl = $data['linkId'] ?? null;
            if (!$linkUrl) {
                // Generate a unique ID if not provided
                $uniqueId = '';
                do {
                    $uniqueId = substr(str_shuffle(str_repeat($x = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', ceil(8 / strlen($x)))), 1, 8);
                    $exists = Link::where('link_url', $this->encryptId($uniqueId))->exists();
                } while ($exists);

                // Encrypt the ID
                $linkUrl = $this->encryptId($uniqueId);
            } else if (isset($data['isEncrypted']) && !$data['isEncrypted']) {
                // If frontend sent unencrypted ID, encrypt it
                $linkUrl = $this->encryptId($linkUrl);
            }

            // Validate that the link_url is unique
            $linkExists = Link::where('link_url', $linkUrl)->exists();
            if ($linkExists) {
                return response()->json(['success' => false, 'error' => 'Link URL already exists. Please try again.'], 422);
            }

            // Generate the redirect URL (the URL users will visit)


            // 1. Save Link
            $link = Link::create([
                'user_id' => $user->id,
                'link_name' => $data['linkName'] ?? null,
                'link_url' => $linkUrl,
                'discount_code' => $data['discountData']['discountCode'] ?? null,
                'discount_code_value' => $data['discountData']['discountCodeValue'] ?? null,
                'discount_value' => $data['discountData']['discountValue'] ?? null,
                'free_shipping' => $data['discountData']['freeShipping'] ?? null,
                'order_discount' => $data['discountData']['orderDiscount'] ?? null,
                'single_order' => $data['additionalSettingsData']['allowOnlyOneOrder'] ?? false,
            ]);

            // 2. Save Popup Message
            if (!empty($data['popupMessageData'])) {
                $popup = $data['popupMessageData'];
                $link->popupMessage()->create([
                    'allow_deselect' => $popup['allowDeselect'] ?? null,
                    'checkout_button_text' => $popup['checkoutButtonText'] ?? null,
                    'close_button_link' => $popup['closeButtonLink'] ?? null,
                    'close_button_text' => $popup['closeButtonText'] ?? null,
                    'copy_text' => $popup['copyText'] ?? null,
                    'countdown_active' => $popup['countdownActive'] ?? null,
                    'heading_text' => $popup['headingText'] ?? null,
                    'is_active' => $popup['isActive'] ?? null,
                    'message_text' => $popup['messageText'] ?? null,
                    'show_order_total' => $popup['showOrderTotal'] ?? null,
                    'show_price' => $popup['showPrice'] ?? null,
                    'timer_text' => $popup['timerText'] ?? null,
                ]);
            }

            // $variantId= 

            // 3. Save Selected Product Variants
            if (!empty($data['selectedProductItems']) && is_array($data['selectedProductItems'])) {
                Log::info('Processing product items for link:', ['items_count' => count($data['selectedProductItems'])]);

                // Process variants in chunks to avoid memory issues
                $chunks = array_chunk($data['selectedProductItems'], 100);

                foreach ($chunks as $chunk) {
                    foreach ($chunk as $item) {
                        Log::info('Processing item:', ['item' => $item]);
                        // Prioritize shopify_variant_id if available, then fall back to variantId
                        $variantId = $item['variantId'];
                        // Only log in debug mode to reduce log size
                        Log::debug('Processing variant:', [
                            'variant_id' => $variantId,
                            'product_id' => $item['productId'] ?? null
                        ]);

                        $link->linkedVariants()->create([
                            'link_id' => $link->id,
                            'product_id' => $item['productId'] ?? null,
                            'variant_id' => $variantId,
                            'price' => $item['price'] ?? null,
                            'quantity' => $item['quantity'] ?? 1,
                        ]);
                    }
                }
            }

            // Commit the transaction first so the link exists when openCheckout queries it
            \DB::commit();

            // Generate the redirect URL by calling openCheckout and extracting the URL from the response
            $response = $this->openCheckout($linkUrl, true);
            $responseData = json_decode($response->getContent(), true);
            $redirectUrl = $responseData['redirect_url'] ?? null;
            Log::info('Generated redirect URL for new link:', ['redirect_url' => $redirectUrl]);

            // Update the link with the redirect_url    
            if ($redirectUrl) {
                $link->update([
                    'redirect_url' => $redirectUrl,
                ]);
            }

            return response()->json([
                'success' => true,
                'link_id' => $link->id,
                'redirect_url' => $link->redirect_url
            ]);
        } catch (\Exception $e) {
            \DB::rollBack();
            return response()->json(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

public function getLinks(Request $request)
{
    $user = Auth::user();
    Log::info('Link listing request:', $request->all());
    $baseUrl = config('app.url') . '/checkout/';

    // Helper to clean link_url
    $cleanLinkUrl = function ($url) {
        $url = str_replace([
            'bidding-local-haseeb.myshopify.com',
            '.myshopify.com',
            'bidding-local-haseeb'
        ], '', $url);
        $url = trim($url, "-/");
        return $url;
    };

    // Helper to convert to sentence case and remove dashes
    $sentenceCase = function ($str) {
        $str = str_replace('-', ' ', $str);
        $str = strtolower($str);
        return ucfirst($str);
    };

    // Helper to clean user name
    $cleanUserName = function ($name) {
        $name = str_replace([
            'bidding-local-haseeb.myshopify.com',
            '.myshopify.com',
            'bidding-local-haseeb'
        ], '', $name);
        $name = str_replace(['-', '.'], ' ', $name); // replace dashes and dots with spaces
        $name = trim($name); // remove extra spaces
        $name = strtolower($name); // all lowercase
        $name = ucfirst($name); // sentence case
        return $name;
    };

    $cleanName = $cleanUserName($user->name);

    // Handle "last=X" case — recent links only
    if ($request->has('last')) {
        $links = Link::where('user_id', $user->id)
            ->latest()
            ->take($request->input('last'))
                ->get(['id', 'link_name', 'link_url', 'redirect_url']);

        $links->transform(function ($link) use ($baseUrl, $cleanLinkUrl, $sentenceCase) {
            $link->original_url = $link->link_url;
            $link->link_url = $cleanLinkUrl($link->link_url);
                $link->full_url = $link->redirect_url;
            $link->link_name = $sentenceCase($link->link_name);
            return $link;
        });

        return response()->json([
            'success' => true,
            'links' => $links,
            'user' => $cleanName, // <<< cleaned name here
        ], 200);
    }

    // Handle paginated + searchable full list
    $perPage = $request->input('per_page', 10);
    $search = $request->input('search', '');

    $query = Link::where('user_id', $user->id);

    if (!empty($search)) {
        $query->where(function ($q) use ($search) {
            $q->where('link_name', 'like', '%' . $search . '%')
              ->orWhere('link_url', 'like', '%' . $search . '%');
        });
    }

    $links = $query->latest()->paginate($perPage, [
        'id',
        'link_name',
        'link_url',
        'clicks',
        'placed_order',
        'created_at',
            'updated_at',
            'redirect_url'
    ]);

    $links->getCollection()->transform(function ($link) use ($baseUrl, $cleanLinkUrl, $sentenceCase) {
        $link->original_url = $link->link_url;
        $link->link_url = $cleanLinkUrl($link->link_url);
            $link->full_url = $link->redirect_url;
        $link->link_name = $sentenceCase($link->link_name);
        return $link;
    });

    return response()->json([
        'success' => true,
        'links' => $links->items(),
        'pagination' => [
            'current_page' => $links->currentPage(),
            'last_page' => $links->lastPage(),
            'per_page' => $links->perPage(),
            'total' => $links->total(),
        ],
        'user' => $cleanName, // <<< cleaned name here
    ], 200);
}


    public function edit($id) {
    $link = Link::findOrFail($id);
    $link->load(['popupMessage', 'linkedVariants.variant.product.media']);

        // Transform the data to include quantity for frontend
        if ($link->linkedVariants) {
            foreach ($link->linkedVariants as $linkedVariant) {
                // Make sure quantity is included in the response
                $linkedVariant->quantity = $linkedVariant->quantity ?? 1;
            }
        }

        Log::info(json_encode($link, JSON_PRETTY_PRINT));
    return inertia('Embedded/Links/CreateLink', ['link' => $link]);
}
public function update(Request $request, $id)
{
    
    $user = auth()->user();
    $data = $request->all();
        Log::info('Data received for updating link:', ['data' => $data, 'link_id' => $id]);
        Log::info('Additional Settings Data received for update:', ['additionalSettingsData' => $data['additionalSettingsData'] ?? 'NOT_FOUND']);

        // Validate the request with per-user uniqueness (ignore current link)
        $validator = Validator::make($data, [
            'linkName' => [
                'required',
                'string',
                'max:255',
                Rule::unique('links', 'link_name')
                    ->where('user_id', $user->id)
                    ->ignore($id) // Ignore the current link when editing
            ],
            'linkId' => 'required|string',
            'selectedProductItems' => 'required|array|min:1',
            'selectedProductItems.*.productId' => 'required',
        ], [
            'linkName.required' => 'The link name is required',
            'linkName.unique' => 'You already have a link with this name. Please choose a different name.',
            'linkName.max' => 'The link name may not be greater than 255 characters.',
            'linkId.required' => 'The link ID is required',
            'selectedProductItems.required' => 'At least one product must be selected',
            'selectedProductItems.min' => 'At least one product must be selected',
            'selectedProductItems.*.productId.required' => 'Product ID is required',
        ]);

        if ($validator->fails()) {
            Log::info('Update validation failed:', ['errors' => $validator->errors()]);
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        \DB::beginTransaction();
    try {
        // 1. Update Link
        $link = Link::where('user_id', $user->id)->findOrFail($id);

            // Ensure we have a unique link_url
            $linkUrl = $data['linkId'] ?? null;
            if (!$linkUrl) {
                // Generate a unique ID if not provided
                $uniqueId = '';
                do {
                    $uniqueId = substr(str_shuffle(str_repeat($x = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', ceil(8 / strlen($x)))), 1, 8);
                    $exists = Link::where('link_url', $this->encryptId($uniqueId))
                        ->where('id', '!=', $id) // Exclude current link
                        ->exists();
                } while ($exists);

                // Encrypt the ID
                $linkUrl = $this->encryptId($uniqueId);
            } else if (isset($data['isEncrypted']) && !$data['isEncrypted']) {
                // If frontend sent unencrypted ID, encrypt it
                $linkUrl = $this->encryptId($linkUrl);
            }

            // Validate that the link_url is unique (excluding current link)
            $linkExists = Link::where('link_url', $linkUrl)
                ->where('id', '!=', $id)
                ->exists();

            if ($linkExists) {
                return response()->json(['success' => false, 'error' => 'Link URL already exists. Please try again.'], 422);
            }

            // Generate the redirect URL (the URL users will visit);

            $link->update([
                'link_name' => $data['linkName'] ?? null,
                'link_url' => $linkUrl,
                'discount_code' => $data['discountData']['discountCode'] ?? null,
                'discount_code_value' => $data['discountData']['discountCodeValue'] ?? null,
                'discount_value' => $data['discountData']['discountValue'] ?? null,
                'free_shipping' => $data['discountData']['freeShipping'] ?? null,
                'order_discount' => $data['discountData']['orderDiscount'] ?? null,
                'single_order' => $data['additionalSettingsData']['allowOnlyOneOrder'] ?? false,
            ]);

        // 2. Update or create Popup Message
        if (!empty($data['popupMessageData'])) {
            $popup = $data['popupMessageData'];
            $link->popupMessage()->updateOrCreate(
                ['link_id' => $link->id],
                [
                    'allow_deselect' => $popup['allowDeselect'] ?? null,
                    'checkout_button_text' => $popup['checkoutButtonText'] ?? null,
                    'close_button_link' => $popup['closeButtonLink'] ?? null,
                    'close_button_text' => $popup['closeButtonText'] ?? null,
                    'copy_text' => $popup['copyText'] ?? null,
                    'countdown_active' => $popup['countdownActive'] ?? null,
                    'heading_text' => $popup['headingText'] ?? null,
                    'is_active' => $popup['isActive'] ?? null,
                    'message_text' => $popup['messageText'] ?? null,
                    'show_order_total' => $popup['showOrderTotal'] ?? null,
                    'show_price' => $popup['showPrice'] ?? null,
                    'timer_text' => $popup['timerText'] ?? null,
                ]
            );
        }

        // 3. Update Selected Product Variants
            // First, delete old variants to avoid duplicates
            $link->linkedVariants()->delete();

            if (!empty($data['selectedProductItems']) && is_array($data['selectedProductItems'])) {
                Log::info('Updating product items for link:', ['items_count' => count($data['selectedProductItems'])]);

                // Store IDs that we've already processed to avoid duplicates
                $processedIds = [];

                // Process variants in chunks to avoid memory issues
                $chunks = array_chunk($data['selectedProductItems'], 100);

                foreach ($chunks as $chunk) {
                    foreach ($chunk as $item) {
                        // Prioritize shopify_variant_id if available, then fall back to shopifyVariantId or variantId
                        $variantId = $item['shopify_variant_id'] ?? $item['shopifyVariantId'] ?? $item['variantId'] ?? null;

                        // Only log in debug mode to reduce log size
                        Log::debug('Updating variant:', [
                            'variant_id' => $variantId,
                            'product_id' => $item['productId'] ?? null
                        ]);

                        $link->linkedVariants()->create([
                            'link_id' => $link->id,
                            'product_id' => $item['productId'] ?? null,
                            'variant_id' => $variantId,
                            'price' => $item['price'] ?? null,
                            'quantity' => $item['quantity'] ?? 1,
                        ]);
                    }
                }
            }

            // Commit the transaction first so the link exists when openCheckout queries it
            \DB::commit();

            // Generate the redirect URL by calling openCheckout and extracting the URL from the response
            $response = $this->openCheckout($linkUrl, true);
            $responseData = json_decode($response->getContent(), true);
            $redirectUrl = $responseData['redirect_url'] ?? null;
            Log::info('Generated redirect URL for updated link:', ['redirect_url' => $redirectUrl]);

            // Update the link with the redirect_url    
            if ($redirectUrl) {
                $link->update([
                    'redirect_url' => $redirectUrl,
                ]);
            }

            return response()->json([
                'success' => true,
                'link_id' => $link->id,
                'redirect_url' => $link->redirect_url
            ]);
    } catch (\Exception $e) {
        \DB::rollBack();
        return response()->json(['success' => false, 'error' => $e->getMessage()], 500);
    }
}

    public function destroy($id)
    {
    $user=Auth::user();
    $link=Link::where('user_id',$user->id)->findOrFail($id);
    $link->popupMessage()->delete(); // Delete associated popup message
    $link->linkedVariants()->delete(); // Delete associated linked variants
    $link->delete();
    return response()->json(['success'=>true,'message'=>'Link deleted successfully'],200);
}

    /**
     * Public endpoint to get link data for the extension
     * 
     * @param int $id The link ID
     * @return \Illuminate\Http\JsonResponse
     */
    public function getLinkData($id)
    {
        try {
            // $link = Link::where('user_id', $id)->firstOrFail();
            // Find the link by ID - this is a public endpoint so no auth required
            $link = Link::findOrFail($id);
            $link->increment('clicks');

            // Check if single_order is enabled and if order has already been placed
            if ($link->single_order && $link->placed_order > 0) {
                Log::info('Single order limit reached for link ID: ' . $id);
                return response()->json([
                    'success' => false,
                    'error_type' => 'single_order_limit_reached',
                    'message' => 'This checkout link has already been used and only allows one order to be placed.'
                ], 403);
            }

            // Load the link relationships with eager loading to avoid N+1 queries
            $link->load([
                'popupMessage',
                'linkedVariants',
                'linkedVariants.variant',
                'linkedVariants.variant.product',
                'linkedVariants.variant.product.media',
                'user.settings'
            ]);

            // Ensure quantity is properly included in the response
            foreach ($link->linkedVariants as $linkedVariant) {
                $linkedVariant->quantity = $linkedVariant->quantity ?? 1;
            }

            // Log the loaded data for debugging
            Log::info('Link data loaded for ID: ' . $id, ['link_data' => $link->toArray()]);

            // Track the link view (optional)
            // $link->increment('clicks');

            Log::info('Link data fetched successfully', ['link_data' => $link]);

            return response()->json([
                'success' => true,
                'link' => $link
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error fetching link data: ' . $e->getMessage(), [
                'link_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'error_type' => 'link_not_found',
                'message' => 'Link not found or error fetching link data: ' . $e->getMessage()
            ], 404);
        }
    }

    public function generateUniqueId()
    {
        $shop = env('APP_URL');

        do {
            $uniqueId = substr(str_shuffle(str_repeat(
                $x = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
                ceil(8 / strlen($x))
            )), 0, 8);

            $exists = Link::where('link_url', $uniqueId)->exists();
        } while ($exists);

        // Save new link
        // $link = Link::create([
        //     'link_url' => $uniqueId,
        //     // Add other fields if needed
        // ]);

        $fullUrl = $shop . '/checkout/' . $uniqueId;

        return response()->json([
            'success' => true,
            'uniqueId' => $uniqueId,
            'fullUrl' => $fullUrl,
            'shop' => $shop
        ]);
    }

    /**
     * Encrypt a unique ID
     *
     * @param string $id The ID to encrypt
     * @return string The encrypted ID
     */
  
    /**
     * Public endpoint to decrypt a link  
     *
     * @param string $encryptedId The encrypted ID from URL
     * @return \Illuminate\Http\JsonResponse
     */
    public function openCheckout($uniqueId, bool $returnJsonOnError = false): JsonResponse|RedirectResponse|Response
    {
        $link = Link::with('popupMessage', 'linkedVariants.variant.product')
            ->where('link_url', $uniqueId)
            ->first();

        if (!$link) {
            // Return JSON error for internal/API calls, HTML page for browser requests
            if ($returnJsonOnError || request()->expectsJson() || request()->is('api/*')) {
                return response()->json(['success' => false, 'error' => 'Link not found'], 404);
            }
            return $this->showLinkNotFoundPage();
        }

        // Check if single_order is enabled and if order has already been placed
        // if ($link->single_order && $link->placed_order > 0) {
        //     return $this->showSingleOrderLimitReached();
        // }

        $user = User::where('id', $link->user_id)->first();
        $shopUrl = "https://" . urlencode($user ? $user->name : 'Guest');

        // Increment clicks counter
        

        // Check if popup message is active
        $popupMessageActive = $link->popupMessage && $link->popupMessage->is_active;

        if (!$popupMessageActive) {
            // If popup message is not active, create a draft order and redirect to invoice URL
            // Create the redirect URL in the format: https://shop-name.myshopify.com/apps/LinkId?link_id=12345
            $redirectUrl = $shopUrl . '/apps/LinkId' . $uniqueId . '?link_id=' . $link->id;
            Log::info('Draft order failed, redirecting to app URL: ' . $redirectUrl);
            return response()->json(['redirect_url' => $redirectUrl]);
        }

        // Default behavior: show popup or redirect to shop
        $backendUrl = env('APP_URL', '/checkout');
        $discountCode = null;
        if ($link->discount_code) {
            // Use the existing discount code
            $discountCode = $link->discount_code_value;
        } elseif ($link->order_discount) {
            // Create a discount on Shopify and retrieve the code
            $discountResponse = $this->createDiscountOnShopify($link);
            Log::info('Discount response from Shopify: ' . json_encode($discountResponse, JSON_PRETTY_PRINT));
            if (isset($discountResponse->body->data->discountCodeBasicCreate->codeDiscountNode->codeDiscount->codes->nodes[0]->code)) {
                $discountCode = $discountResponse->body->data->discountCodeBasicCreate->codeDiscountNode->codeDiscount->codes->nodes[0]->code;
                Log::info('Discount code created: ' . $discountCode);
            }
        } elseif ($link->free_shipping) {
            // Create a free shipping discount on Shopify and retrieve the code
            $freeShippingResponse = $this->createFreeShippingOnShopify($link);
            Log::info('Free shipping response from Shopify: ' . json_encode($freeShippingResponse, JSON_PRETTY_PRINT));
            if (isset($freeShippingResponse->body->data->discountCodeFreeShippingCreate->codeDiscountNode->codeDiscount->codes->nodes[0]->code)) {
                $discountCode = $freeShippingResponse->body->data->discountCodeFreeShippingCreate->codeDiscountNode->codeDiscount->codes->nodes[0]->code;
            }
            Log::info('Free shipping discount code created: ' . $discountCode);
        }

        // Add both the link_id and backend_url parameters to the URL for the extension to read
        $redirectUrl = $shopUrl . '?link_id=' . $link->id . '&backend_url=' . urlencode($backendUrl);
        if ($discountCode) {
            Log::info('Adding discount code to redirect URL: ' . $discountCode);
            $redirectUrl .= '&discount_code=' . urlencode($discountCode);
        }
        Log::info('Redirecting to: ' . $redirectUrl);
        // dd('Redirecting to: ' . $redirectUrl);
        return response()->json(['redirect_url' => $redirectUrl]);
    }


    public function openCheckoutLink($uniqueId): JsonResponse|RedirectResponse|Response
    {
        $link = Link::with('popupMessage', 'linkedVariants.variant.product')
            ->where('link_url', $uniqueId)
            ->first();

        if (!$link) {
            return $this->showLinkNotFoundPage();
        }

        // Check if single_order is enabled and if order has already been placed
        if ($link->single_order && $link->placed_order > 0) {
            return $this->showSingleOrderLimitReached();
        }

        $user = User::where('id', $link->user_id)->first();
        $shopUrl = "https://" . urlencode($user ? $user->name : 'Guest');

        // Increment clicks counter
        $link->increment('clicks');

        // Check if popup message is active
        $popupMessageActive = $link->popupMessage && $link->popupMessage->is_active;

        if (!$popupMessageActive) {
            // If popup message is not active, create a draft order and redirect to invoice URL
            $draftOrderResult = $this->createDraftOrder($link->id);
            if ($draftOrderResult && isset($draftOrderResult['invoice_url'])) {
                Log::info('Redirecting to draft order invoice: ' . $draftOrderResult['invoice_url']);
                return redirect()->to($draftOrderResult['invoice_url']);
            }
        }

        // Default behavior: show popup or redirect to shop
        $backendUrl = env('APP_URL', '/checkout');
        $discountCode = null;
        if ($link->discount_code) {
            // Use the existing discount code
            $discountCode = $link->discount_code_value;
        } elseif ($link->order_discount) {
            // Create a discount on Shopify and retrieve the code
            $discountResponse = $this->createDiscountOnShopify($link);
            Log::info('Discount response from Shopify: ' . json_encode($discountResponse, JSON_PRETTY_PRINT));
            if (isset($discountResponse->body->data->discountCodeBasicCreate->codeDiscountNode->codeDiscount->codes->nodes[0]->code)) {
                $discountCode = $discountResponse->body->data->discountCodeBasicCreate->codeDiscountNode->codeDiscount->codes->nodes[0]->code;
                Log::info('Discount code created: ' . $discountCode);
            }
        } elseif ($link->free_shipping) {
            // Create a free shipping discount on Shopify and retrieve the code
            $freeShippingResponse = $this->createFreeShippingOnShopify($link);
            Log::info('Free shipping response from Shopify: ' . json_encode($freeShippingResponse, JSON_PRETTY_PRINT));
            if (isset($freeShippingResponse->body->data->discountCodeFreeShippingCreate->codeDiscountNode->codeDiscount->codes->nodes[0]->code)) {
                $discountCode = $freeShippingResponse->body->data->discountCodeFreeShippingCreate->codeDiscountNode->codeDiscount->codes->nodes[0]->code;
            }
            Log::info('Free shipping discount code created: ' . $discountCode);
        }

        // Add both the link_id and backend_url parameters to the URL for the extension to read
        $redirectUrl = $shopUrl . '?link_id=' . $link->id . '&backend_url=' . urlencode($backendUrl);
        if ($discountCode) {
            Log::info('Adding discount code to redirect URL: ' . $discountCode);
            $redirectUrl .= '&discount_code=' . urlencode($discountCode);
        }
        Log::info('Redirecting to: ' . $redirectUrl);
        return redirect()->to($redirectUrl);
    }
    /**
     * Show a user-friendly error page when link is not found
     *
     * @return \Illuminate\Http\Response
     */
    private function showLinkNotFoundPage()
    {
        $html = '
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Link Not Found</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    background: linerar-gradient(135deg, #667eea 0%, #764ba2 100%);
                    margin: 0;
                    padding: 0;
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .container {
                    background: white;
                    border-radius: 20px;
                    padding: 40px;
                    text-align: center;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                    max-width: 500px;
                    margin: 20px;
                }
                .icon {
                    font-size: 80px;
                    margin-bottom: 20px;
                    color: #ff6b6b;
                }
                h1 {
                    color: #333;
                    margin-bottom: 15px;
                    font-size: 28px;
                }
                p {
                    color: #666;
                    line-height: 1.6;
                    margin-bottom: 30px;
                    font-size: 16px;
                }
                .btn {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 12px 30px;
                    border: none;
                    border-radius: 25px;
                    font-size: 16px;
                    cursor: pointer;
                    text-decoration: none;
                    display: inline-block;
                    transition: transform 0.3s ease;
                }
                .btn:hover {
                    transform: translateY(-2px);
                }
                .error-code {
                    background: #f8f9fa;
                    color: #6c757d;
                    padding: 10px 20px;
                    border-radius: 5px;
                    font-family: monospace;
                    font-size: 14px;
                    margin-top: 20px;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="icon">🔗❌</div>
                <h1>Oops! Link Not Found</h1>
                <p>
                    The checkout link you\'re looking for doesn\'t exist or may have been removed. 
                    This could happen if the link was deleted or if there was a typo in the URL.
                </p>
                <a href="javascript:history.back()" class="btn">Go Back</a>
                <div class="error-code">Error Code: 404 - Link Not Found</div>
            </div>
            
            <script>
                // Auto-close after 10 seconds if opened in a popup
                if (window.opener) {
                    setTimeout(() => {
                        window.close();
                    }, 10000);
                }
            </script>
        </body>
        </html>';

        return response($html, 404)->header('Content-Type', 'text/html');
    }

    /**
     * Show a user-friendly error page when single order limit is reached
     *
     * @return \Illuminate\Http\Response
     */
    private function showSingleOrderLimitReached()
    {
        $html = '
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Order Limit Reached</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    margin: 0;
                    padding: 0;
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .container {
                    background: white;
                    border-radius: 20px;
                    padding: 40px;
                    text-align: center;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                    max-width: 500px;
                    margin: 20px;
                }
                .icon {
                    font-size: 80px;
                    margin-bottom: 20px;
                    color: #ff9800;
                }
                h1 {
                    color: #333;
                    margin-bottom: 15px;
                    font-size: 28px;
                }
                p {
                    color: #666;
                    line-height: 1.6;
                    margin-bottom: 30px;
                    font-size: 16px;
                }
                .btn {
                    display: inline-block;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 15px 30px;
                    text-decoration: none;
                    border-radius: 50px;
                    font-weight: bold;
                    transition: transform 0.3s ease;
                }
                .btn:hover {
                    transform: translateY(-2px);
                }
                .error-code {
                    margin-top: 30px;
                    font-size: 12px;
                    color: #999;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="icon">⚠️</div>
                <h1>Order Limit Reached</h1>
                <p>
                    This checkout link has already been used and only allows one order to be placed.
                    <br><br>
                    If you believe this is an error, please contact the person who shared this link with you.
                </p>
                <a href="javascript:history.back()" class="btn">Go Back</a>
                <div class="error-code">Single Order Limit Enforced</div>
            </div>
            
            <script>
                // Auto-close after 10 seconds if opened in a popup
                if (window.opener) {
                    setTimeout(() => {
                        window.close();
                    }, 10000);
                }
            </script>
        </body>
        </html>';

        return response($html, 403)->header('Content-Type', 'text/html');
    }


    public function count(Request $request)
    {
        $data = $request->validate([
            'link_id' => 'required|exists:links,id',
            'event_type' => 'required|string',
            'timestamp' => 'required|date',
            'page_url' => 'nullable|url'
        ]);
        // Log the incoming request data
        Log::info('Order count request received:', $data);
        // Process the order count logic heres
        // For example, increment the order count for the link
        $link = Link::findOrFail($data['link_id']);
        $link->increment('placed_order');
        Log::info('Order count incremented for link ID: ' . $data['link_id']);
        // Optionally, store the event in a separate table or log file
        return response()->json(['success' => true, 'message' => 'Order count recorded successfully']);
    }
}
