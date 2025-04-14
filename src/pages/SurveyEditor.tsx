import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api';
import { SurveyQuestion } from '../types/survey';
import usePageTitle from '../hooks/usePageTitle';
import Input from '../components/Input';

const SurveyEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [surveyData, setSurveyData] = useState({
    title: '',
    description: '',
    question1: '',
    question2: '',
  });
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);

  usePageTitle('Edit Survey');

  // Fetch survey and questions data
  useEffect(() => {
    const fetchSurveyData = async () => {
      if (!id) return;

      try {
        setLoading(true);
        setError(null);

        // Fetch survey details
        const survey = await api.getSurveyById(id);
        // Fetch survey questions
        const surveyQuestions = await api.getSurveyQuestions(id);

        setSurveyData({
          title: survey.title,
          description: survey.description || '',
          question1: surveyQuestions[0]?.question || '',
          question2: surveyQuestions[1]?.question || '',
        });
        setQuestions(surveyQuestions);
      } catch (err) {
        console.error('Error fetching survey:', err);
        setError(err instanceof Error ? err.message : 'An error occurred while fetching the survey');
      } finally {
        setLoading(false);
      }
    };

    fetchSurveyData();
  }, [id]);

  const handleSurveyDataChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSurveyData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    try {
      setSaving(true);
      setError(null);

      // Update survey details
      await api.updateSurvey(id, {
        title: surveyData.title,
        description: surveyData.description
      });

      // Update questions
      if (questions[0]) {
        await api.updateSurveyQuestion(id, questions[0].id, {
          question: surveyData.question1,
          type: "text",
          required: true,
          order_number: 1
        });
      }

      if (questions[1]) {
        await api.updateSurveyQuestion(id, questions[1].id, {
          question: surveyData.question2,
          type: "text",
          required: true,
          order_number: 2
        });
      }

      navigate(`/surveys/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while updating the survey');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-24 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-full"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Edit Survey</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          id="title"
          name="title"
          label="Survey Title"
          value={surveyData.title}
          onChange={handleSurveyDataChange}
          required
        />

        <Input
          id="description"
          name="description"
          label="Description"
          value={surveyData.description}
          onChange={handleSurveyDataChange}
          multiline
          rows={4}
        />

        <Input
          id="question1"
          name="question1"
          label="First Question"
          value={surveyData.question1}
          onChange={handleSurveyDataChange}
          required
          placeholder="Enter your first question"
        />

        <Input
          id="question2"
          name="question2"
          label="Second Question"
          value={surveyData.question2}
          onChange={handleSurveyDataChange}
          required
          placeholder="Enter your second question"
        />

        {error && (
          <div className="text-red-600 text-sm">
            {error}
          </div>
        )}

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate(`/surveys/${id}`)}
            className="py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SurveyEditor; 