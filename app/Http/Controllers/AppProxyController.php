<?php

namespace App\Http\Controllers;

use App\Http\Traits\ShopifyOrderTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class AppProxyController extends Controller
{
    use ShopifyOrderTrait;

    public function index(Request $request)
    {
        Log::info('App Proxy Request:', $request->all());

        $linkId = $request->query('link_id');

        if (!$linkId) {
            return response()->json([
                'success' => false,
                'message' => 'link_id is required',
            ], 400);
        }

        // Get customer data if logged in
        $customerData = [];
        $customerId = $request->query('logged_in_customer_id');
        if ($customerId) {
            $customerData['id'] = "gid://shopify/Customer/" . $customerId;
        }
        
        // Create draft order using the trait method
        $draftOrderResult = $this->createDraftOrder($linkId, $customerData);

        if ($draftOrderResult && isset($draftOrderResult['invoice_url'])) {
            Log::info('Draft order created successfully:', [
                'link_id' => $linkId,
                'invoice_url' => $draftOrderResult['invoice_url']
            ]);
            
            return redirect()->to($draftOrderResult['invoice_url']);
        }

        Log::error('Failed to create draft order:', ['link_id' => $linkId]);

        return response('Failed to create draft order', 500);
    }
}
