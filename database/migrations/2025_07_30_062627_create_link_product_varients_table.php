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
        Schema::create('link_product_varients', function (Blueprint $table) {
    $table->id();
    $table->unsignedBigInteger('link_id')->nullable();
    $table->unsignedBigInteger('product_id')->nullable();
    $table->unsignedBigInteger('variant_id')->nullable();
    $table->decimal('price', 10, 2)->nullable();
    $table->timestamps();
});

    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('link_product_varients');
    }
};
