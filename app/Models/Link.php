<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Link extends Model {
    use HasFactory;

    protected $fillable = ['user_id', 'link_name', 'link_url', 'discount_code', 'discount_code_value', 'discount_value', 'free_shipping', 'order_discount',  'clicks', 'placed_order'];

    public function popupMessage() {
        return $this->hasOne(PopupMessage::class);
    }

    public function linkedVariants() {
        return $this->hasMany(LinkProductVarient::class, 'link_id');
    }

    public function user() {
        return $this->belongsTo(User::class);
    }
}

