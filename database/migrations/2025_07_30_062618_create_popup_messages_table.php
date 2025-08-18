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
        Schema::create('popup_messages', function (Blueprint $table) {
    $table->id();
    $table->unsignedBigInteger('link_id')->nullable();
    $table->boolean('allow_deselect')->nullable();
    $table->string('checkout_button_text')->nullable();
    $table->string('close_button_link')->nullable();
    $table->string('close_button_text')->nullable();
    $table->string('copy_text')->nullable();
    $table->boolean('countdown_active')->nullable();
    $table->string('heading_text')->nullable();
    $table->boolean('is_active')->nullable();
    $table->text('message_text')->nullable();
    $table->boolean('show_order_total')->nullable();
    $table->boolean('show_price')->nullable();
    $table->string('timer_text')->nullable();
    $table->timestamps();
});

    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('popup_messages');
    }
};
