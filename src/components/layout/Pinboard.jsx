import React from 'react';
import { Badge } from '../ui/Badge';
import { MapPin, Calendar as CalIcon, Clock } from 'lucide-react';

// A mock version of the timetable grid for the pinboard.
// Later pages will use a full editable TimetableGrid component.
const MiniTimetable = () => {
  return (
    <div className="flex flex-col h-full bg-white border border-slate-200 rounded-md">
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
        <h3 className="font-semibold text-slate-800 flex items-center">
          <CalIcon className="w-4 h-4 mr-2 text-indigo-600" />
          Today's Timetable
        </h3>
        <span className="text-xs text-slate-500 font-medium">Auto-scrolls</span>
      </div>
      <div className="flex-1 p-4 flex flex-col items-center justify-center text-slate-400">
        {/* Placeholder for actual timetable grid */}
        <p className="text-sm">Grid will render here based on system_config N slots</p>
      </div>
    </div>
  );
};

const NoticeBoard = () => {
  return (
    <div className="flex flex-col h-full bg-white border border-slate-200 rounded-md">
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
        <h3 className="font-semibold text-slate-800">Notice Board</h3>
      </div>
      <div className="flex-1 p-4 overflow-y-auto space-y-3 max-h-64">
        {/* Mock notice card */}
        <div className="p-3 bg-amber-50 border border-amber-400 rounded-md shadow-sm">
          <div className="flex justify-between items-start">
            <Badge variant="warning">Assignment</Badge>
            <span className="text-xs font-semibold text-amber-700">Due in 2 days</span>
          </div>
          <h4 className="mt-2 text-sm font-semibold text-slate-800">React Components Lab</h4>
          <p className="mt-1 text-xs text-slate-600">Posted by Prof. Smith • Oct 10</p>
          <div className="mt-3">
            <button className="text-xs bg-white text-slate-700 border border-slate-300 px-3 py-1 rounded hover:bg-slate-50 transition-colors">
              Submit Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const Pinboard = () => {
  return (
    <div className="flex w-full space-x-6 h-72 mb-6">
      <div className="w-[60%] h-full">
        <MiniTimetable />
      </div>
      <div className="w-[40%] h-full">
        <NoticeBoard />
      </div>
    </div>
  );
};
