<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class VerifySyncToken
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Get token from header or query parameter
        $token = $request->header('X-Sync-Token') ?? $request->query('sync_token');
        
        // Get expected token from environment
        $expectedToken = env('SYNC_API_TOKEN');
        
        // If no token is configured, deny access for security
        if (!$expectedToken) {
            return response()->json([
                'error' => 'Sync API is not configured',
                'message' => 'SYNC_API_TOKEN environment variable is not set'
            ], 503);
        }
        
        // Verify token
        if (!$token || !hash_equals($expectedToken, $token)) {
            return response()->json([
                'error' => 'Unauthorized',
                'message' => 'Invalid or missing sync token. Provide it via X-Sync-Token header or sync_token query parameter.'
            ], 401);
        }
        
        return $next($request);
    }
}
