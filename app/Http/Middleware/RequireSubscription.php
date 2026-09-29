<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Osiset\ShopifyApp\Util;
use Symfony\Component\HttpFoundation\Response;

class RequireSubscription
{
    /**
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || ! $user->isFreemium()) {
            return $next($request);
        }

        $subscribeUrl = $this->subscribeUrl($request);

        if ($this->isFrontendPageRequest($request)) {
            return Inertia::render('Embedded/SubscriptionRequired', [
                'subscribeUrl' => $subscribeUrl,
            ])->toResponse($request);
        }

        return response()->json([
            'message' => 'A subscription is required to continue.',
            'subscription_required' => true,
            'subscribe_url' => $subscribeUrl,
        ], 402);
    }

    private function isFrontendPageRequest(Request $request): bool
    {
        return $request->isMethod('GET')
            && $request->routeIs(
                'home',
                'links',
                'links.create',
                'links.edit',
                'how-it-works',
                'settings',
                'plans',
            );
    }

    private function subscribeUrl(Request $request): string
    {
        return route(Util::getShopifyConfig('route_names.billing'), [
            'shop' => $request->user()->name,
            'host' => $request->query('host', ''),
            'locale' => $request->query('locale'),
        ]);
    }
}
