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
            // Add the inventory_policy column with a default value of 'deny'
            $table->string('inventory_policy')->default('deny')->after('inventory_quantity');

            // If you need to handle existing data, you can set a default value for existing rows
            // $table->string('inventory_policy')->default('deny')->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('product_varients', function (Blueprint $table) {
            // Drop the inventory_policy column if it exists
            $table->dropColumn('inventory_policy');
            //
        });
    }
};
