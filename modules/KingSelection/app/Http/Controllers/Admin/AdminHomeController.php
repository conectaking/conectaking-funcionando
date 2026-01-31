<?php

namespace KingSelection\Http\Controllers\Admin;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class AdminHomeController extends Controller
{
    public function index(Request $request)
    {
        return view('admin.home');
    }
}

