<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('product_varients', function (Blueprint $table) {
            // Add the inventory_tracked column with a default value of true
            $table->boolean('inventory_tracked')->default(true)->after('inventory_policy');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('product_varients', function (Blueprint $table) {
            // Drop the inventory_tracked column if it exists
            $table->dropColumn('inventory_tracked');
        });
    }
};
