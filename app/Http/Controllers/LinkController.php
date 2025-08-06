<?php

namespace App\Http\Controllers;

use App\Models\Link;
use App\Models\User;
use App\Http\Traits\ShopifyOrderTrait;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rules\Exists;

class LinkController extends Controller
{
    use ShopifyOrderTrait;
    public function saveLink(Request $request)
    {
        $user = auth()->user();
        $data = $request->all();
        Log::info('Data received for saving link:', ['data' => $data]);

        // Validate the request
        $validator = \Validator::make($data, [
            'linkName' => 'required|string|max:255',
            'linkId' => 'required|string',
            'selectedProductItems' => 'required|array|min:1',
            'selectedProductItems.*.shopify_variant_id' => 'required',
        ], [
            'linkName.required' => 'The link name is required',
            'linkId.required' => 'The link ID is required',
            'selectedProductItems.required' => 'At least one product must be selected',
            'selectedProductItems.min' => 'At least one product must be selected',
            'selectedProductItems.*.shopify_variant_id.required' => 'Product variant ID is required',
        ]);

        if ($validator->fails()) {
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
                        ]);
                    }
                }
            }

            \DB::commit();
            return response()->json(['success' => true, 'link_id' => $link->id]);
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

    // Handle "last=X" case — recent links only
    if ($request->has('last')) {
        $links = Link::where('user_id', $user->id)
            ->latest()
            ->take($request->input('last'))
                ->get(['id', 'link_name', 'link_url']);

            // Add full_url to each link
            $links->transform(function ($link) use ($baseUrl) {
                $link->full_url = $baseUrl . $link->link_url;
                return $link;
            });

        return response()->json([
            'success' => true,
            'links' => $links
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
        'updated_at'
    ]);

        // Append full URL to each link
        $links->getCollection()->transform(function ($link) use ($baseUrl) {
            $link->full_url = $baseUrl . $link->link_url;
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
        ]
        ], 200);
}


    public function edit($id) {
    $link = Link::findOrFail($id);
    $link->load(['popupMessage', 'linkedVariants.variant.product.media']);
    Log::info(json_encode($link, JSON_PRETTY_PRINT));
    return inertia('Embedded/Links/CreateLink', ['link' => $link]);
}
public function update(Request $request, $id)
{
    $user = auth()->user();
    $data = $request->all();

        // Validate the request
        $validator = \Validator::make($data, [
            'linkName' => 'required|string|max:255',
            'linkId' => 'required|string',
            'selectedProductItems' => 'required|array|min:1',
            'selectedProductItems.*.shopify_variant_id' => 'required',
        ], [
            'linkName.required' => 'The link name is required',
            'linkId.required' => 'The link ID is required',
            'selectedProductItems.required' => 'At least one product must be selected',
            'selectedProductItems.min' => 'At least one product must be selected',
            'selectedProductItems.*.shopify_variant_id.required' => 'Product variant ID is required',
        ]);

        if ($validator->fails()) {
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

            $link->update([
                'link_name' => $data['linkName'] ?? null,
                'link_url' => $linkUrl,
                'discount_code' => $data['discountData']['discountCode'] ?? null,
                'discount_code_value' => $data['discountData']['discountCodeValue'] ?? null,
                'discount_value' => $data['discountData']['discountValue'] ?? null,
                'free_shipping' => $data['discountData']['freeShipping'] ?? null,
                'order_discount' => $data['discountData']['orderDiscount'] ?? null,
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
                        ]);
                    }
                }
            }
        \DB::commit();
        return response()->json(['success' => true, 'link_id' => $link->id]);
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

            // Load the link relationships with eager loading to avoid N+1 queries
            $link->load([
                'popupMessage',
                'linkedVariants',
                'linkedVariants.variant',
                'linkedVariants.variant.product',
                'linkedVariants.variant.product.media'
            ]);

            // Log the loaded data for debugging
            Log::info('Link data loaded for ID: ' . $id, ['link_data' => $link->toArray()]);

            // Track the link view (optional)
            $link->increment('clicks');

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
                'message' => 'Link not found or error fetching link data: ' . $e->getMessage()
            ], 404);
        }
    }

    public function generateUniqueId()
    {
        $user = auth()->user();
        // app url from env
        $shop = env('APP_URL'); // Get the shop name from authenticated user

        $uniqueId = '';
        do {
            // Generate a random string of 8 characters (alphanumeric)
            $uniqueId = substr(str_shuffle(str_repeat($x = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', ceil(8 / strlen($x)))), 1, 8);

            // Check if this ID already exists in the database
            $exists = Link::where('link_url', $uniqueId)->exists();
        } while ($exists); // Keep generating until we find a unique one

        // Encrypt the unique ID
        $encryptedId = $this->encryptId($uniqueId);

        // Construct the full URL with shop name and encrypted ID
        $fullUrl = $shop . '/checkout/' . $encryptedId;




        return response()->json([
            'success' => true,
            'uniqueId' => $encryptedId, // Store the encrypted version
            'originalId' => $uniqueId,  // Original ID for reference (you may remove this in production)
            'fullUrl' => $fullUrl,
            'shop' => $shop // Include shop URL for reference
        ]);
    }

    /**
     * Encrypt a unique ID
     *
     * @param string $id The ID to encrypt
     * @return string The encrypted ID
     */
    private function encryptId($id)
    {
        // dd($id); // Debugging line to check the ID being encrypted
        // Using Laravel's built-in encryption
        return encrypt($id);
    }

    /**
     * Decrypt an encrypted unique ID
     *
     * @param string $encryptedId The encrypted ID
     * @return string The original ID
     */
    public function decryptId($encryptedId)
    {
        // dd($encryptedId); // Debugging line to check the ID being decrypted
        try {
            // dd(decrypt($encryptedId)); // Debugging line to check the decrypted ID
            return decrypt($encryptedId);
        } catch (\Exception $e) {
            // Handle decryption errors
            Log::error('Failed to decrypt ID: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Public endpoint to decrypt a link ID
     *
     * @param string $encryptedId The encrypted ID from URL
     * @return \Illuminate\Http\JsonResponse
     */
    public function decryptLinkId($encryptedId): JsonResponse|RedirectResponse
    {
        $originalId = $this->decryptId($encryptedId);

        if ($originalId === null) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid or corrupted link ID'
            ], 400);
        }

        // Find the link in database with its popup message
        $link = Link::with('popupMessage', 'linkedVariants.variant.product')
            ->where('link_url', $encryptedId)
            ->first();

        if (!$link) {
            return response()->json([
                'success' => false,
                'message' => 'Link not found'
            ], 404);
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
            // Log::info('Creating discount on Shopify for link ID: ' . json_encode($link, JSON_PRETTY_PRINT));
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
}
