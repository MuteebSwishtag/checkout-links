<?php

namespace App\Http\Controllers;

use App\Models\Link;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class LinkController extends Controller
{
    public function saveLink(Request $request)
    {
        $user = auth()->user();
        $data = $request->all();

        \DB::beginTransaction();
        try {
            // 1. Save Link
            $link = Link::create([
                'user_id' => $user->id,
                'link_name' => $data['linkName'] ?? null,
                'link_url' => $data['linkId'] ?? null,
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

            // 3. Save Selected Product Variants
            if (!empty($data['selectedProductItems']) && is_array($data['selectedProductItems'])) {
                foreach ($data['selectedProductItems'] as $item) {
                    $link->linkedVariants()->create([
                        'product_id' => $item['productId'] ?? null,
                        'variant_id' => isset($item['variantId']) ? (strpos($item['variantId'], '_') !== false ? explode('_', $item['variantId'])[1] : $item['variantId']) : null,
                        'price' => $item['price'] ?? null,
                    ]);
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
    // dd($request->all());
    Log::info('Page param received:', ['page' => $request->all()]);


    // Handle "last=X" case — recent links only
    if ($request->has('last')) {
        $links = Link::where('user_id', $user->id)
            ->latest()
            ->take($request->input('last'))
            ->get(['id', 'link_name']);

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

    $links = $query->paginate($perPage, [
        'id',
        'link_name',
        'link_url',
        'clicks',
        'placed_order',
        'created_at',
        'updated_at'
    ]);

    return response()->json([
        'success' => true,
        'links' => $links->items(),
        'pagination' => [
            'current_page' => $links->currentPage(),
            'last_page' => $links->lastPage(),
            'per_page' => $links->perPage(),
            'total' => $links->total(),
        ]
    ]);
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

    \DB::beginTransaction();
    try {
        // 1. Update Link
        $link = Link::where('user_id', $user->id)->findOrFail($id);
        $link->update([
            'link_name' => $data['linkName'] ?? null,
            'link_url' => $data['linkId'] ?? null,
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
        // $link->linkedVariants()->delete(); // Remove old variants
        if (!empty($data['selectedProductItems']) && is_array($data['selectedProductItems'])) {
            // Log::info('Selected Product Items: ' . json_encode($data['selectedProductItems'], JSON_PRETTY_PRINT));
            foreach ($data['selectedProductItems'] as $item) {
                $link->linkedVariants()->updateOrCreate(
                    ['link_id'=> $link->id],
                    [
                        'product_id' => $item['productId'] ?? null,
                        'variant_id' => $item['variantId'] ?? null,
                        'price' => $item['price'] ?? null,
                    ]
                );
            }
        }
        \DB::commit();
        return response()->json(['success' => true, 'link_id' => $link->id]);
    } catch (\Exception $e) {
        \DB::rollBack();
        return response()->json(['success' => false, 'error' => $e->getMessage()], 500);
    }
}

public  function  destroy($id){
    $user=Auth::user();
    $link=Link::where('user_id',$user->id)->findOrFail($id);
    $link->popupMessage()->delete(); // Delete associated popup message
    $link->linkedVariants()->delete(); // Delete associated linked variants
    $link->delete();
    return response()->json(['success'=>true,'message'=>'Link deleted successfully'],200);
}
};
