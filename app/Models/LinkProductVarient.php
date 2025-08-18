<?php

namespace App\Models;

use App\Models\Products\Product;
use App\Models\Products\ProductVarient;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LinkProductVarient extends Model {
    use HasFactory;

    protected $fillable = ['link_id', 'product_id', 'variant_id', 'price', 'quantity'];

    public function link() {
        return $this->belongsTo(Link::class);
    }

    public function product() {
        return $this->belongsTo(Product::class, 'product_id');
    }

    public function variant() {
        return $this->belongsTo(ProductVarient::class, 'variant_id', 'shopify_product_varient_id');
    }
}

