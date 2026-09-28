<?php

namespace App\Http\Controllers;

use App\Http\Traits\ShopifyOrderTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use App\Models\Link;

class AppProxyController extends Controller
{
    use ShopifyOrderTrait;

    public function index(Request $request)
    {

        $linkId = $request->query('link_id');
        $link = Link::where('id', $linkId)->first();
        
        if (!$link) {
            return $this->showLinkNotFoundPage();
        }
        
        $link->increment('clicks');
        
        if ($link->single_order == 1 && $link->placed_order > 0) {
            return $this->showSingleOrderLimitReached();
        }
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
            
            return redirect()->to($draftOrderResult['invoice_url']);
        }

        Log::error('Failed to create draft order:', ['link_id' => $linkId]);

        return response('Failed to create draft order', 500);
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
}
