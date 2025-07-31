<?php

namespace App\Models\Products;

use App\Models\Link;
use App\Models\Products\Product;
use App\Models\Orders\OrderLineItem;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProductVarient extends Model
{
    use HasFactory;

    protected $fillable = ['product_id', 'shopify_product_varient_id', 'shopify_inventory_item_id', 'compare_at_price', 'price', 'title', 'inventory_quantity'];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
    public function link(){
        return $this->belongsTo(Link::class);
    }
}

