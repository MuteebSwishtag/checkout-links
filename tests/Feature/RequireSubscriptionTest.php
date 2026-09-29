<?php

namespace Tests\Feature;

use App\Http\Middleware\RequireSubscription;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Routing\Route;
use Illuminate\Testing\TestResponse;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class RequireSubscriptionTest extends TestCase
{
    public function test_freemium_frontend_routes_render_subscription_page_and_do_not_call_controller(): void
    {
        $user = $this->shop(['shopify_freemium' => true]);
        $request = $this->request('GET', '/require-subscription/frontend?host=test-host&locale=en', 'links', $user);

        $response = (new RequireSubscription())->handle($request, function () {
            abort(418, 'The protected frontend controller was called.');
        });

        TestResponse::fromBaseResponse($response)
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Embedded/SubscriptionRequired')
                ->where('subscribeUrl', route('billing', [
                    'shop' => $user->name,
                    'host' => 'test-host',
                    'locale' => 'en',
                ]))
            );
    }

    public function test_freemium_action_requests_return_payment_required_json(): void
    {
        $user = $this->shop(['shopify_freemium' => true]);
        $request = $this->request('POST', '/require-subscription/action?host=test-host', 'links.update', $user);

        $response = (new RequireSubscription())->handle($request, function () {
            return response()->json(['called' => true]);
        });

        TestResponse::fromBaseResponse($response)
            ->assertStatus(402)
            ->assertJson([
                'message' => 'A subscription is required to continue.',
                'subscription_required' => true,
                'subscribe_url' => route('billing', [
                    'shop' => $user->name,
                    'host' => 'test-host',
                ]),
            ]);
    }

    public function test_non_freemium_users_pass_through_normally(): void
    {
        $user = $this->shop(['shopify_freemium' => false]);
        $request = $this->request('GET', '/require-subscription/passthrough', 'settings', $user);

        $response = (new RequireSubscription())->handle($request, function () {
            return response('controller called');
        });

        TestResponse::fromBaseResponse($response)
            ->assertOk()
            ->assertSee('controller called');
    }

    private function request(string $method, string $uri, string $routeName, User $user): Request
    {
        $request = Request::create($uri, $method);
        $request->setUserResolver(fn () => $user);

        $route = new Route([$method], $uri, []);
        $route->name($routeName);
        $request->setRouteResolver(fn () => $route);

        return $request;
    }

    private function shop(array $attributes = []): User
    {
        return (new User())->forceFill(array_merge([
            'id' => 1,
            'name' => 'test-shop.myshopify.com',
            'email' => 'test@example.com',
            'password' => 'test-token',
            'shopify_grandfathered' => false,
            'shopify_freemium' => false,
            'plan_id' => null,
        ], $attributes));
    }
}
