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
        Schema::create('links', function (Blueprint $table) {
    $table->id();
    $table->unsignedBigInteger('user_id')->nullable();
    $table->string('link_name')->nullable();
    $table->string('link_url')->nullable();
    $table->boolean('discount_code')->nullable();
    $table->string('discount_code_value')->nullable();
    $table->decimal('discount_value', 10, 2)->nullable();
    $table->boolean('free_shipping')->nullable();
    $table->boolean('order_discount')->nullable();
    $table->timestamps();
});
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('links');
    }
};
