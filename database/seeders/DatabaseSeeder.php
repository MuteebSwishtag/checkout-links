<?php

namespace Database\Seeders;

use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Osiset\ShopifyApp\Storage\Models\Plan;
class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        // User::factory()->create([
        //     'name' => 'Test User',
        //     'email' => 'test@example.com',
        // ]);

        Plan::create([
            'name' => 'Basic Plan',
            'price' => 5,
            'type' => 'RECURRING',
            'interval' => 'EVERY_30_DAYS',
            'trial_days' => 0,
            'test' => false,
            'on_install' => true,
        ]);
    }
}
